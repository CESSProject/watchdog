package util

import (
	"bytes"
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"gopkg.in/gomail.v2"
	"text/template"
)

type SmtpConfig struct {
	SmtpUrl      string
	SmtpPort     int
	SenderAddr   string
	SmtpPassword string
	Receiver     []string
}

func (conf *SmtpConfig) SendMail(content model.AlertContent) (err error) {

	t, err := template.ParseFiles(constant.AlertStaticPath + "template.html")
	if err != nil {
		log.Logger.Errorf("Error parsing template: %v", err)
		return err
	}
	var body bytes.Buffer
	if err = t.Execute(&body, content); err != nil {
		log.Logger.Errorf("Error executing template: %v", err)
		return err
	}

	m := gomail.NewMessage()
	m.SetHeader("From", conf.SenderAddr)
	m.SetHeader("Subject: Storage Node Status Alert!")
	m.SetBody("text/html", body.String())
	d := gomail.NewDialer(conf.SmtpUrl, conf.SmtpPort, conf.SenderAddr, conf.SmtpPassword)
	for _, receiver := range conf.Receiver {
		m.SetHeader("To", receiver)
		if err = sendEmailWithRetry(d, m); err != nil {
			log.Logger.Errorf("Failed to send email to: %v: %v, retrying %d times", m.GetHeader("To"), err, constant.HttpMaxRetry)
		} else {
			log.Logger.Infof("Successfully sent email to %s", receiver)
		}
	}
	return
}

func sendEmailWithRetry(d *gomail.Dialer, m *gomail.Message) (err error) {
	for i := 0; i < constant.HttpMaxRetry; i++ {
		if err = d.DialAndSend(m); err != nil {
			log.Logger.Warnf("Fail when send email to: %v : %v, retrying (%d/%d)\n", m.GetHeader("To"), err, i+1, constant.HttpMaxRetry)
		} else {
			break
		}
	}
	return err
}
