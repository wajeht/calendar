package env

import (
	"os"
	"strconv"
)

func GetString(key string, defaultValue string) string {
	value, exist := os.LookupEnv(key)
	if !exist {
		return defaultValue
	}

	return value;
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

	return intValue;
}
