package assets

import "embed"

//go:embed "static" "migrations"
var EmbeddedFiles embed.FS
