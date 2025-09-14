package env

import (
	"os"
	"strconv"
	"strings"
)

func GetString(key string, defaultValue string) string {
	value, exist := os.LookupEnv(key)
	if !exist {
		return defaultValue
	}

	return value
}

func GetInt(key string, defaultValue int) int {
	value, exist := os.LookupEnv(key)

	if !exist {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)

	if err != nil {
		panic(err)
	}

	return intValue
}

func GetBool(key string, defaultValue bool) bool {
	value, exist := os.LookupEnv(key)
	if !exist {
		return defaultValue
	}

	switch strings.ToLower(value) {
	case "true", "1", "yes", "on":
		return true
	case "false", "0", "no", "off":
		return false
	default:
		return defaultValue
	}
}
