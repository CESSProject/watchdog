package test

import (
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/model"
	"log"
	"net/http"
	"strings"
	"time"
)

func CallWebhook() error {
	content := model.AlertContent{
		AlertTime:   time.Now().Format(constant.TimeFormat),
		HostIp:      "127.0.0.1",
		ContainerID: "miner1",
		Description: "The Storage Miner is not a positive status or get punishment",
	}
	sendData := `{
		"msg_type": "text",
		"content": {"text": "` + "CESS Information: " + " Alert Time: " + content.AlertTime + ", Host: " + content.HostIp + ", cID: " + content.ContainerID + ", Description: " + content.Description + `"}
	}`
	req, err := http.NewRequest("POST", "https://xxxx", strings.NewReader(sendData))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Call webhook failed!")
	} else {
		if resp.StatusCode != http.StatusOK {
			log.Println("Unexceptional response status code: ", resp.StatusCode)
		}
		err = resp.Body.Close()
		if err != nil {
			return err
		}
	}
	err = resp.Body.Close()
	return nil
}
