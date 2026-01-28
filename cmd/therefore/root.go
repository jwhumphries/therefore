package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var cfgFile string

var rootCmd = &cobra.Command{
	Use:   "therefore",
	Short: "A philosophy/theology blog platform",
	Long:  `Therefore is a blog platform for philosophy and theology content, built with Go + templ backend and React + HeroUI frontend.`,
	RunE:  runServer,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./therefore.yaml)")
	rootCmd.PersistentFlags().String("port", ":8080", "server port")
	rootCmd.PersistentFlags().String("log-level", "info", "log level (debug, info, warn, error)")
	rootCmd.PersistentFlags().Bool("dev", false, "enable development mode (use Vite dev server for assets)")
	rootCmd.PersistentFlags().String("base-url", "http://localhost:8080", "public base URL for sitemap and SEO")

	_ = viper.BindPFlag("port", rootCmd.PersistentFlags().Lookup("port"))
	_ = viper.BindPFlag("log_level", rootCmd.PersistentFlags().Lookup("log-level"))
	_ = viper.BindPFlag("dev", rootCmd.PersistentFlags().Lookup("dev"))
	_ = viper.BindPFlag("base_url", rootCmd.PersistentFlags().Lookup("base-url"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName("therefore")
		viper.SetConfigType("yaml")
		viper.AddConfigPath(".")
	}

	viper.SetEnvPrefix("THEREFORE")
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("port", ":8080")
	viper.SetDefault("log_level", "info")
	viper.SetDefault("dev", false)
	viper.SetDefault("base_url", "http://localhost:8080")

	if err := viper.ReadInConfig(); err != nil {
		var configFileNotFoundError viper.ConfigFileNotFoundError
		if !errors.As(err, &configFileNotFoundError) {
			fmt.Fprintf(os.Stderr, "Error reading config file: %v\n", err)
		}
	}
}
