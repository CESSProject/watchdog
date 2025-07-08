package core

import (
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"gopkg.in/yaml.v3"
	"math"
	"os"
	"strconv"
	"strings"
	"time"
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

func loadConfigFromEnv(cfg model.YamlConfig) model.YamlConfig {
	if port := os.Getenv("WATCHDOG_PORT"); port != "" {
		if port, err := strconv.Atoi(port); err == nil {
			cfg.Port = port
		}
	}
	if external := os.Getenv("WATCHDOG_IS_EXTERNAL"); external != "" {
		cfg.External = strings.ToLower(external) == "true"
	}
	if scrapeInterval := os.Getenv("WATCHDOG_SCRAPE_INTERVAL"); scrapeInterval != "" {
		if interval, err := strconv.Atoi(scrapeInterval); err == nil {
			cfg.ScrapeInterval = interval
		}
	}
	if username := os.Getenv("WATCHDOG_USERNAME"); username != "" {
		cfg.Auth.Username = username
	}
	if password := os.Getenv("WATCHDOG_PASSWORD"); password != "" {
		cfg.Auth.Password = password
	}
	if jwtKey := os.Getenv("WATCHDOG_JWT_SECRET"); jwtKey != "" {
		cfg.Auth.JWTSecretKey = jwtKey
	}
	if expiryStr := os.Getenv("WATCHDOG_TOKEN_EXPIRY"); expiryStr != "" {
		if expiry, err := strconv.Atoi(expiryStr); err == nil {
			cfg.Auth.TokenExpiry = expiry
		}
	}
	return cfg
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
	CustomConfig = loadConfigFromEnv(CustomConfig) // env priority over config file

	// set default value for CustomConfig.Auth
	CustomConfig = setDefaultValueForAuth(CustomConfig)

	// 1800 <= ScrapeInterval <= 3600
	CustomConfig.ScrapeInterval = int(math.Max(1800, math.Min(float64(CustomConfig.ScrapeInterval), 3600)))
	log.Logger.Infof("Init watchdog with config file:\n %v \n", CustomConfig)
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

func setDefaultValueForAuth(cfg model.YamlConfig) model.YamlConfig {
	if cfg.Auth.Username == "" {
		cfg.Auth.Username = "cess"
	}

	if cfg.Auth.Password == "" {
		cfg.Auth.Password = "Cess123456"
	}

	if cfg.Auth.JWTSecretKey == "" {
		cfg.Auth.JWTSecretKey = time.Now().Format("20060102150405")
		log.Logger.Info("Generated a random JWT secret key cause it's empty in config file.")
	}

	if !(cfg.Auth.TokenExpiry > 0 && cfg.Auth.TokenExpiry <= 24) {
		cfg.Auth.TokenExpiry = 1
	}

	return cfg
}
