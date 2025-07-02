// internal/middleware/auth.go
package middleware

import (
	"errors"
	"github.com/CESSProject/watchdog/internal/model"
	"net/http"
	"strings"
	"time"

	_ "github.com/CESSProject/watchdog/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// JWT claims structure
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Generate JWT token
func GenerateToken(username string, cfg *model.YamlConfig) (string, error) {
	// Set expiration time
	expiry := time.Duration(cfg.Auth.TokenExpiry) * time.Hour
	if expiry == 0 {
		expiry = 24 * time.Hour // Default to 24 hours if not set
	}

	// Create claims with expiry
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   username,
		},
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign and get the complete encoded token as a string
	return token.SignedString([]byte(cfg.Auth.JWTSecretKey))
}

// Parse and validate JWT token
func ParseToken(tokenString string, cfg *model.YamlConfig) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.Auth.JWTSecretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// JWT authentication middleware
func JWTAuth(cfg *model.YamlConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Bearer Token format
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format, expected 'Bearer TOKEN'"})
			c.Abort()
			return
		}

		// Parse and validate the token
		claims, err := ParseToken(parts[1], cfg)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set username in context for optional use in handlers
		c.Set("username", claims.Username)
		c.Next()
	}
}
