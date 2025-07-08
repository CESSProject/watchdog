package test

import (
	"bytes"
	"encoding/json"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "github.com/CESSProject/watchdog/internal/model"
	_ "github.com/CESSProject/watchdog/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestAuthFlow(t *testing.T) {
	cfg := &model.YamlConfig{}
	cfg.Auth.Username = "testuser"
	cfg.Auth.Password = "testpass"
	cfg.Auth.JWTSecretKey = "test-secret-key"

	router := service.SetupRouter(cfg, gin.Default())

	invalidLogin := service.LoginRequest{
		Username: "wrong",
		Password: "wrong",
	}
	invalidBody, _ := json.Marshal(invalidLogin)
	req1, _ := http.NewRequest("POST", "/api/login", bytes.NewBuffer(invalidBody))
	resp1 := httptest.NewRecorder()
	router.ServeHTTP(resp1, req1)
	assert.Equal(t, http.StatusUnauthorized, resp1.Code)

	validLogin := service.LoginRequest{
		Username: "testuser",
		Password: "testpass",
	}
	validBody, _ := json.Marshal(validLogin)
	req2, _ := http.NewRequest("POST", "/api/login", bytes.NewBuffer(validBody))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusOK, resp2.Code)

	var loginResp service.LoginResponse
	json.Unmarshal(resp2.Body.Bytes(), &loginResp)
	assert.NotEmpty(t, loginResp.Token)

	req3, _ := http.NewRequest("GET", "/api/status", nil)
	req3.Header.Set("Authorization", "Bearer "+loginResp.Token)
	resp3 := httptest.NewRecorder()
	router.ServeHTTP(resp3, req3)
	assert.Equal(t, http.StatusOK, resp3.Code)

	req4, _ := http.NewRequest("GET", "/api/status", nil)
	resp4 := httptest.NewRecorder()
	router.ServeHTTP(resp4, req4)
	assert.Equal(t, http.StatusUnauthorized, resp4.Code)
}
