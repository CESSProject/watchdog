package core

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/client"
	"github.com/pkg/errors"
	"io"
	"net"
	"strconv"
	"strings"
	"time"
)

type DockerCli interface {
	ContainerList(context.Context, types.ContainerListOptions) ([]types.Container, error)
	ContainerLogs(context.Context, string, types.ContainerLogsOptions) (io.ReadCloser, error)
	Events(context.Context, types.EventsOptions) (<-chan events.Message, <-chan error)
	ContainerInspect(ctx context.Context, containerID string) (types.ContainerJSON, error)
	ContainerStats(ctx context.Context, containerID string, stream bool) (types.ContainerStats, error)
	Ping(ctx context.Context) (types.Ping, error)
	ContainerExecAttach(ctx context.Context, execID string, config types.ExecStartCheck) (types.HijackedResponse, error)
	ContainerExecCreate(ctx context.Context, container string, config types.ExecConfig) (types.IDResponse, error)
}

type Client struct {
	dockerCli DockerCli
}

func NewClient(host model.HostItem) (*Client, error) {
	dockerHost := "tcp://" + host.IP + ":" + host.Port
	ip := net.ParseIP(host.IP)
	if util.IsPrivateIP(ip) {
		cli, err := client.NewClientWithOpts(
			client.WithHost(dockerHost),
			client.WithAPIVersionNegotiation(),
		)
		if err != nil {
			log.Logger.Errorf("Error when init a docker cli with %s: %v", host.IP, err)
			return nil, err
		}
		return &Client{cli}, nil
	} else {
		if host.CAPath == "" || host.CertPath == "" || host.KeyPath == "" {
			log.Logger.Warn("Use a unsafe tcp connection will lead your mnemonic!")
			log.Logger.Warnf("Can not init a docker cli with public IP: %s without a tls configuration", host.IP)
			return nil, nil
		} else {
			cli, err := client.NewClientWithOpts(
				client.WithHost(dockerHost),
				client.WithTLSClientConfig(host.CAPath, host.CertPath, host.KeyPath),
				client.WithAPIVersionNegotiation(),
			)
			if err != nil {
				log.Logger.Errorf("Error when init a tls docker cli with %s: %v", host.IP, err)
				return nil, err
			}
			return &Client{cli}, nil
		}
	}
}

func (cli *Client) ListContainers(ctx context.Context, host string) ([]model.Container, error) {
	list, err := cli.dockerCli.ContainerList(ctx, types.ContainerListOptions{})
	if err != nil {
		go NormalAlert(host, "Failed to call list container api from docker daemon")
		return nil, err
	}
	containers := make([]model.Container, len(list))
	for i, c := range list {
		name := "no name"
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}
		containers[i] = model.Container{
			ID:            c.ID,
			Names:         c.Names,
			Name:          name,
			Image:         c.Image,
			ImageID:       c.ImageID,
			Command:       c.Command,
			Created:       c.Created,
			State:         c.State,
			Status:        c.Status,
			CPUPercent:    "0%",
			MemoryPercent: "0%",
			MemoryUsage:   "0",
		}
	}
	return containers, nil
}

func (cli *Client) SetContainerStats(ctx context.Context, cid string, host string) (model.ContainerStat, error) {
	response, err := cli.dockerCli.ContainerStats(ctx, cid, false)
	if err != nil {
		log.Logger.Errorf("Failed to get container stats: %v", err)
		go NormalAlert(host, "Failed to call container stats api from docker daemon")
		return model.ContainerStat{}, nil
	}
	defer func(Body io.ReadCloser) {
		err = Body.Close()
		if err != nil {
			log.Logger.Errorf("Failed to close io reader: %v", err)
		}
	}(response.Body)
	var v *types.StatsJSON
	decoder := json.NewDecoder(response.Body)

	if err = decoder.Decode(&v); err == io.EOF {
		log.Logger.Error("Docker Container Stats API Response io.EOF")
		return model.ContainerStat{}, nil
	} else if err != nil {
		panic(err)
	}
	cpuPercent := calculateCPUPercentUnix(v)
	// Usage must subtract cache-file-used
	memUsage := v.MemoryStats.Usage - v.MemoryStats.Stats["file"]
	memLimit := v.MemoryStats.Limit
	memPercent := float64(memUsage) / float64(memLimit) * 100.0
	res := model.ContainerStat{
		CPUPercent:    cpuPercent,
		MemoryPercent: strconv.FormatFloat(memPercent, 'f', 2, 64),
		MemoryUsage:   strconv.Itoa(int(memUsage / 1048576)),
	}
	return res, nil
}

func calculateCPUPercentUnix(v *types.StatsJSON) string {

	cpuDelta := float64(v.CPUStats.CPUUsage.TotalUsage) - float64(v.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(v.CPUStats.SystemUsage) - float64(v.PreCPUStats.SystemUsage)
	onlineCPUs := float64(v.CPUStats.OnlineCPUs)

	if onlineCPUs == 0.0 {
		onlineCPUs = float64(len(v.CPUStats.CPUUsage.PercpuUsage))
	}
	if systemDelta > 0.0 && cpuDelta > 0.0 {
		cpuPercent := (cpuDelta / systemDelta) * onlineCPUs * 100.0
		return strconv.FormatFloat(cpuPercent, 'f', 2, 64)
	}
	return "0.00"
}

func (cli *Client) ExeCommand(ctx context.Context, cid string, config types.ExecConfig, host string) ([]byte, error) {
	execId, err := cli.dockerCli.ContainerExecCreate(ctx, cid, config)
	if err != nil {
		go NormalAlert(host, "Failed to call exec api from docker daemon")
		return nil, errors.Wrap(err, "exe cmd in container error")
	}
	resp, err := cli.dockerCli.ContainerExecAttach(ctx, execId.ID, types.ExecStartCheck{})
	if err != nil {
		go NormalAlert(host, "Failed to call exec api from docker daemon")
		return nil, errors.Wrap(err, "exe cmd in container error")
	}
	defer resp.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, resp.Reader); err != nil {
		return nil, errors.Wrap(err, "read response from container error")
	}

	return buf.Bytes(), nil
}

func (cli *Client) Ping(ctx context.Context) (types.Ping, error) {
	return cli.dockerCli.Ping(ctx)
}

func NormalAlert(hostIP string, message string) {
	content := model.AlertContent{
		AlertTime:   time.Now().Format(constant.TimeFormat),
		HostIp:      hostIP,
		Description: message,
	}
	if WebhooksConfig != nil {
		if err := WebhooksConfig.SendAlertToWebhook(content); err != nil {
			log.Logger.Error("Failed to send alert webhook:", err)
		}
	}
}
