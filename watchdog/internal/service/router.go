package service

import (
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"net"
	"net/http"
	"strings"
)

func RegisterRoutes(r *gin.Engine) {
	r.GET("/", healthCheck)
	r.GET("/health_check", healthCheck)
	r.GET("/list", list)
	r.GET("/hosts", getHosts)
	r.GET("/clients", getClientsStatus)
	r.POST("/config", setConfig)
	r.GET("/config", getConfig)
	r.GET("/toggle", getAlertToggle)
	r.POST("/toggle", setAlertToggle)
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}

// unsafe request might leak your smtpAcc/smtpPwd and webhookUrl
func safeConnectionOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := getClientIP(c)
		log.Logger.Infof("Try to update config, request by client ip: %s", ip)
		if !util.IsPrivateIP(net.ParseIP(ip)) && c.Request.TLS == nil {
			log.Logger.Warnf("Can not update config with a public client IP %s without TLS encrypt", ip)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Access denied, Please request with a Private IP or TLS",
			})
			return
		}
		c.Next()
	}
}

func getClientIP(c *gin.Context) string {
	xForwardedFor := c.Request.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		return strings.Split(xForwardedFor, ",")[0]
	}
	xRealIP := c.Request.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}
	addr := c.Request.RemoteAddr
	ip, _, _ := net.SplitHostPort(addr)
	return ip
}
