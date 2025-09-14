package assets

import "embed"

//go:embed "static" "templates" "migrations"
var EmbeddedFiles embed.FS
