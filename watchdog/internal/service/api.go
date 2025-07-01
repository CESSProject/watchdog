package service

import (
	"context"
	"fmt"
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/core"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

// watchdog godoc
// @Schemes
// @Description Service HealthCheck
// @Tags HealthCheck
// @Success 200 {string} ok
// @Router / [get]
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, 0)
}

// watchdog godoc
// @Description  List storage node on host
// @Tags         List storage node by host
// @Produce      json
// @Param        host   query  string   false  "Host IP"
// @Success      200  {object}  []HostInfoVO
// @Router       /list  [get]
func list(c *gin.Context) {
	host := c.Query("host")
	data, err := getListByHost(host)
	if err != nil {
		log.Logger.Errorf("Failed to get list by host %s: %v", host, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve host data"})
		return
	}
	c.JSON(http.StatusOK, data)
}

// watchdog godoc
// @Description  List host
// @Tags         Get Hosts
// @Success      200  {object}  []string
// @Router       /hosts [get]
func getHosts(c *gin.Context) {
	res := make([]string, 0, len(core.Clients))
	for hostIP := range core.Clients {
		res = append(res, hostIP)
	}
	sort.Strings(res)
	c.JSON(http.StatusOK, res)
}

// watchdog godoc
// @Description  Get Clients Status
// @Tags         Get Hosts
// @Success      200  {object} map[string]string
// @Router       /clients [get]
func getClientsStatus(c *gin.Context) {
	res := make(map[string]string, len(core.Clients))
	for _, client := range core.Clients {
		status := "Sleeping"
		if client.Updating {
			status = "Running"
		}
		res[client.Host] = status
	}
	c.JSON(http.StatusOK, res)
}

// watchdog godoc
// @Description  Update watchdog configuration
// @Tags         Update Config
// @Accept       json
// @Produce      json
// @Param        model.yamlConfig body model.YamlConfig true "YAML Configuration"
// @Success      200 {object} model.YamlConfig
// @Router       /config [post]
func setConfig(c *gin.Context) {
	var newConfig model.YamlConfig
	if err := c.ShouldBindJSON(&newConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	configTemp, err := util.LoadConfigFile(constant.ConfPath)
	if err != nil {
		log.Logger.Errorf("Failed to load file from %s", constant.ConfPath)
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Failed to load config file from %s", constant.ConfPath)})
		return
	}
	// remove old config
	util.RemoveFields(configTemp, "hosts", "scrapeInterval", "alert")

	// do not leak acc/password in unsafe(http without tls) network (keep acc/password as original conf)
	newConfig.Alert.Email.SenderAddr = core.CustomConfig.Alert.Email.SenderAddr
	newConfig.Alert.Email.SmtpPassword = core.CustomConfig.Alert.Email.SmtpPassword

	// add new config
	util.AddFields(configTemp, newConfig)
	err = util.SaveConfigFile(constant.ConfPath, configTemp)
	if err != nil {
		log.Logger.Errorf("Failed to save file to: %v", constant.ConfPath)
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Failed to save config file to %s", constant.ConfPath)})
		return
	}
	log.Logger.Infof("Save new config %v to: %s", configTemp, constant.ConfPath)

	timeout := time.Duration(core.CustomConfig.ScrapeInterval) * time.Second
	if timeout <= 0 || timeout > 60*time.Minute {
		timeout = 60 * time.Minute
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	go runWithNewConf(ctx)
	c.JSON(http.StatusOK, gin.H{"message": "update Watchdog config success"})
}

// watchdog godoc
// @Description  Get watchdog configuration
// @Tags         Get Config
// @Produce      json
// @Success      200 {object} model.YamlConfig
// @Router       /config [get]
func getConfig(c *gin.Context) {
	var conf model.YamlConfig
	conf = core.CustomConfig
	for i := 0; i < len(conf.Alert.Webhook); i++ {
		conf.Alert.Webhook[i] = splitURLByTopLevelDomain(conf.Alert.Webhook[i])
	}
	for i := 0; i < len(conf.Alert.Email.Receiver); i++ {
		conf.Alert.Email.Receiver[i] = replaceFirstThreeChars(conf.Alert.Email.Receiver[i])
	}
	conf.Alert.Email.SenderAddr = replaceFirstThreeChars(conf.Alert.Email.SenderAddr)
	conf.Alert.Email.SmtpPassword = "******"
	c.JSON(http.StatusOK, conf)
}

// watchdog godoc
// @Description  Get Alert Status
// @Tags         Get Alert Status
// @Produce      json
// @Success      200 {object} bool
// @Router       /toggle [get]
func getAlertToggle(c *gin.Context) {
	status := core.CustomConfig.Alert.Enable
	c.JSON(http.StatusOK, status)
}

// watchdog godoc
// @Description  Set Alert Status
// @Tags         Set Alert Status
// @Accept       json
// @Produce      json
// @Param        model.AlertToggle body model.AlertToggle true "Alert Toggle Status"
// @Success      200 {object} model.AlertToggle
// @Router       /toggle [post]
func setAlertToggle(c *gin.Context) {
	var alertToggle = model.AlertToggle{}
	if err := c.ShouldBindJSON(&alertToggle); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	conf := core.CustomConfig
	conf.Alert.Enable = alertToggle.Status
	data, err := yaml.Marshal(conf)
	if err != nil {
		log.Logger.Errorf("Failed to parse conf: %v", conf)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse conf"})
		return
	}
	err = os.WriteFile(constant.ConfPath, data, 0644)
	if err != nil {
		log.Logger.Errorf("Failed to save file to: %v", constant.ConfPath)
		c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Failed to save config file to %s", constant.ConfPath)})
		return
	}
	core.CustomConfig.Alert.Enable = alertToggle.Status
	log.Logger.Infof("Switch alert status to: %v", alertToggle.Status)
	c.JSON(http.StatusOK, gin.H{"message": "updateConfig alert status success"})
}

type HostInfoVO struct {
	Host          string
	MinerInfoList []core.MinerInfo
}

func getListByHost(hostIp string) ([]HostInfoVO, error) {
	var res []HostInfoVO
	var err error
	keys := make([]string, 0, len(core.Clients))
	for k := range core.Clients {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	if hostIp != "" {
		if client, ok := core.Clients[hostIp]; ok {
			if client.MinerInfoMap != nil {
				vo := HostInfoVO{
					Host:          hostIp,
					MinerInfoList: getMinersListByClientInfo(client.MinerInfoMap),
				}
				for minerName := range vo.MinerInfoList {
					vo.MinerInfoList[minerName].Conf.Chain.Mnemonic = ""
				}
				res = append(res, vo)
			} else {
				err = fmt.Errorf("client's MinerInfoMap is nil for host: %s", hostIp)
			}
		} else {
			log.Logger.Warnf("Host IP not found: %s", hostIp)
		}
	} else {
		res = make([]HostInfoVO, 0, len(core.Clients))
		for _, k := range keys {
			if core.Clients[k].MinerInfoMap != nil {
				vo := HostInfoVO{
					Host:          k,
					MinerInfoList: getMinersListByClientInfo(core.Clients[k].MinerInfoMap),
				}
				for minerName := range vo.MinerInfoList {
					vo.MinerInfoList[minerName].Conf.Chain.Mnemonic = ""
				}
				res = append(res, vo)
			}
		}
		sort.Slice(res, func(i, j int) bool {
			return res[i].Host < res[j].Host
		})
	}
	return res, err
}

func getMinersListByClientInfo(minerMap map[string]*core.MinerInfo) []core.MinerInfo {
	var minerInfoArray []core.MinerInfo
	for _, minerInfo := range minerMap {
		minerInfo.Conf.Chain.Mnemonic = "-"
		minerInfoArray = append(minerInfoArray, *minerInfo)
	}
	return minerInfoArray
}

func replaceFirstThreeChars(s string) string {
	// 123456@cess.network -> ***456@cess.network
	if len(s) < 5 {
		return s
	}
	return "***" + s[3:]
}

func splitURLByTopLevelDomain(inputURL string) string {
	// https://example.com/bot/v2/hook/4bb9bfc7-dat4-41g9-962d-d8b4c139f37c -> https://example.com/***
	parsedURL, err := url.Parse(inputURL)
	if err != nil {
		log.Logger.Warnf("Parse webhook url err: %v", err)
		return ""
	}
	hostname := parsedURL.Hostname()
	lastDotIndex := strings.LastIndex(hostname, ".")
	if lastDotIndex == -1 {
		log.Logger.Warnf("no top-level domain found in Webhook URL")
		return ""
	}
	res := parsedURL.Scheme + "://" + hostname + "/***"
	return res
}

func runWithNewConf(ctx context.Context) {
	for key := range core.Clients {
		core.Clients[key].Active = false
	}

	const maxRetries = 600
	const retryInterval = 6 * time.Second

	for try := 0; try < maxRetries; try++ {
		select {
		case <-ctx.Done():
			log.Logger.Warn("Context cancelled while trying to run with new config")
			return
		default:
			if canProceed() {
				if err := reloadConfiguration(); err != nil {
					log.Logger.Errorf("Failed to reload configuration: %v", err)
					return
				}
				log.Logger.Info("Run with new config successfully")
				return
			}
			log.Logger.Infof("Run with new config failed, Some watchdog clients might running, retrying (%d/%d)", try+1, maxRetries)
			time.Sleep(retryInterval)
		}
	}
	log.Logger.Warn("Failed to run with new config after maximum retries")
}

func reloadConfiguration() error {
	if err := core.InitWatchdogConfig(); err != nil {
		return fmt.Errorf("failed to init watchdog config: %w", err)
	}

	core.InitSmtpConfig()
	core.InitWebhookConfig()

	if err := core.InitWatchdogClients(core.CustomConfig); err != nil {
		return fmt.Errorf("failed to init watchdog clients: %w", err)
	}

	if err := core.RunWatchdogClients(core.CustomConfig); err != nil {
		return fmt.Errorf("failed to run watchdog clients: %w", err)
	}

	return nil
}

func canProceed() bool {
	for _, client := range core.Clients {
		if client.Updating {
			return false
		}
	}
	return true
}
