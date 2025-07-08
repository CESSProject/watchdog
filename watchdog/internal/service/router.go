package service

import (
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/middleware"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"net"
	"net/http"
	"strings"
)

func SetupRouter(cfg *model.YamlConfig, r *gin.Engine) *gin.Engine {
	public := r.Group("/")
	{
		public.POST("/login", login(cfg))
		public.POST("/health_check", healthCheck)
		public.POST("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	protected := r.Group("/")
	protected.Use(middleware.JWTAuth(cfg))
	{
		protected.GET("/list", list)
		protected.GET("/hosts", getHosts)
		protected.GET("/clients", getHosts)
		protected.GET("/config", getConfig)
		protected.GET("/toggle", getAlertToggle)
		protected.POST("/config", setConfig)
		protected.POST("/toggle", setAlertToggle)
	}
	return r
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
