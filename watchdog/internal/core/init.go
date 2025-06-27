package core

import (
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"gopkg.in/yaml.v3"
	"math"
	"os"
)

type MinerInfoVO struct {
	Host          string
	MinerInfoList []MinerInfo
}

var CustomConfig model.YamlConfig

var SmtpConfig *util.SmtpConfig
var WebhooksConfig *util.WebhookConfig

func Run() {
	log.InitLogger()
	err := InitWatchdogConfig()
	if err != nil {
		return
	}
	InitSmtpConfig()
	InitWebhookConfig()
	err = InitWatchdogClients(CustomConfig)
	if err != nil {
		log.Logger.Fatalf("Init CESS Node Monitor Service Failed: %v", err)
	}
	err = RunWatchdogClients(CustomConfig)
	if err != nil {
		log.Logger.Fatalf("Run CESS Storage Monitor failed: %v", err)
		return
	}
}

func InitWatchdogConfig() error {
	yamlFile, err := os.ReadFile(constant.ConfPath)
	if err != nil {
		log.Logger.Fatalf("Error when read file from %s: %v", constant.ConfPath, err)
		return err
	}
	CustomConfig = model.YamlConfig{}
	// yaml.Unmarshal
	//For string types, the zero value is the empty string "".
	//For numeric types, the zero value is 0.
	//For Boolean types, the zero value is false.
	//For pointer types, the zero value is nil.
	if err := yaml.Unmarshal(yamlFile, &CustomConfig); err != nil {
		log.Logger.Fatalf("Error when parse file from %s: %v", constant.ConfPath, err)
		return err
	}
	// 1800 <= ScrapeInterval <= 3600
	CustomConfig.ScrapeInterval = int(math.Max(1800, math.Min(float64(CustomConfig.ScrapeInterval), 3600)))
	log.Logger.Infof("Init watchdog with config file: %v \n", CustomConfig)
	return nil
}

func InitSmtpConfig() {
	if CustomConfig.Alert.Email.SmtpEndpoint == "" ||
		CustomConfig.Alert.Email.SmtpPort == 0 ||
		CustomConfig.Alert.Email.SenderAddr == "" ||
		CustomConfig.Alert.Email.SmtpPassword == "" ||
		len(CustomConfig.Alert.Email.Receiver) == 0 {
		return
	}
	SmtpConfig = &util.SmtpConfig{
		SmtpUrl:      CustomConfig.Alert.Email.SmtpEndpoint,
		SmtpPort:     CustomConfig.Alert.Email.SmtpPort,
		SenderAddr:   CustomConfig.Alert.Email.SenderAddr,
		SmtpPassword: CustomConfig.Alert.Email.SmtpPassword,
		Receiver:     CustomConfig.Alert.Email.Receiver,
	}
}

func InitWebhookConfig() {
	if len(CustomConfig.Alert.Webhook) == 0 {
		return
	}
	WebhooksConfig = &util.WebhookConfig{
		Webhooks: CustomConfig.Alert.Webhook,
	}
}
