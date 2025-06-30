package main

import (
	"github.com/CESSProject/watchdog/docs"
	"github.com/CESSProject/watchdog/internal/core"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"strconv"
)

func main() {
	core.Run()
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()
	docs.SwaggerInfo.BasePath = "/"
	corsConfig := cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}
	router.Use(cors.New(corsConfig))
	service.RegisterRoutes(router)
	var httpPort string
	if core.CustomConfig.External {
		httpPort = ":" + strconv.Itoa(core.CustomConfig.Port)
	} else {
		httpPort = "127.0.0.1:" + strconv.Itoa(core.CustomConfig.Port)
	}
	err := router.Run(httpPort)
	if err != nil {
		log.Logger.Error("Failed to start server:", err)
		return
	} else {
		log.Logger.Infof("Server running on port: %d", core.CustomConfig.Port)
	}
}
