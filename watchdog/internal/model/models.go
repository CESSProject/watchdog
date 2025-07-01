package model

type HostItem struct {
	IP       string `yaml:"ip"`                  // host ip
	Port     string `yaml:"port"`                // docker api port
	CAPath   string `yaml:"ca_path,omitempty"`   // /etc/docker/127.0.0.1/ca.pem
	CertPath string `yaml:"cert_path,omitempty"` // /etc/docker/127.0.0.1/cert.pem
	KeyPath  string `yaml:"key_path,omitempty"`  // /etc/docker/127.0.0.1/key.pem
}

type AlertContent struct {
	AlertTime    string
	HostIp       string
	Description  string
	DetailUrl    string
	SignatureAcc string
	ContainerID  string
	BlockNumber  uint64
}

type Container struct {
	ID            string   `json:"id"`
	Names         []string `json:"names"`
	Name          string   `json:"name"`
	Image         string   `json:"image"`
	ImageID       string   `json:"image_id"`
	Command       string   `json:"command"`
	Created       int64    `json:"created"`
	State         string   `json:"state"`
	Status        string   `json:"status"`
	CPUPercent    string   `json:"cpu_percent"`
	MemoryPercent string   `json:"memory_percent"`
	MemoryUsage   string   `json:"mem_usage"`
}

type ContainerStat struct {
	CPUPercent    string
	MemoryPercent string
	MemoryUsage   string
}

type MinerStat struct {
	Collaterals      string             `json:"collaterals"`
	Debt             string             `json:"debt"`
	Status           string             `json:"status"`            // positive, exit, frozen, unready(register on chain but no get a tag from tee)
	DeclarationSpace string             `json:"declaration_space"` // unit: TiB
	IdleSpace        string             `json:"idle_space"`
	ServiceSpace     string             `json:"service_space"`
	LockSpace        string             `json:"lock_space"` // upload file allocated to this miner but not get a proof from tee yet, it can be serviceSpace after get proof from tee
	LatestPunishInfo []PunishSminerData `json:"punish_info_list"`
	TotalReward      string             `json:"total_reward"`
	RewardIssued     string             `json:"reward_issued"`
}

type MinerConfigFile struct {
	App   AppConfig   `yaml:"app"`
	Chain ChainConfig `yaml:"chain"`
}

type AppConfig struct {
	Workspace   string `yaml:"workspace"`
	Port        int    `yaml:"port"`
	MaxUseSpace int    `yaml:"maxusespace"`
	Cores       int    `yaml:"cores"`
	APIEndpoint string `yaml:"apiendpoint"`
}

type ChainConfig struct {
	Mnemonic    string   `yaml:"mnemonic"`
	StakingAcc  string   `yaml:"stakingacc"`
	EarningsAcc string   `yaml:"earningsacc"`
	RPCs        []string `yaml:"rpcs"`
	TEEs        []string `yaml:"tees"`
	Timeout     int      `yaml:"timeout"`
}

type YamlConfig struct {
	External       bool       `yaml:"external" json:"external"`
	Port           int        `yaml:"port" json:"port"`
	Hosts          []HostItem `yaml:"hosts" json:"hosts"`
	ScrapeInterval int        `yaml:"scrapeInterval" json:"scrapeInterval"`
	Alert          struct {
		Enable  bool     `yaml:"enable" json:"enable"`
		Webhook []string `yaml:"webhook,omitempty" json:"webhook,omitempty"`
		Email   struct {
			SmtpEndpoint string   `yaml:"smtp_endpoint,omitempty" json:"smtp_endpoint,omitempty"`
			SmtpPort     int      `yaml:"smtp_port,omitempty" json:"smtp_port,omitempty"`
			SenderAddr   string   `yaml:"smtp_account,omitempty" json:"smtp_account,omitempty"`
			SmtpPassword string   `yaml:"smtp_password,omitempty" json:"smtp_password,omitempty"`
			Receiver     []string `yaml:"receiver,omitempty" json:"receiver,omitempty"`
		} `yaml:"email"`
	} `yaml:"alert" json:"alert"`
}

type AlertToggle struct {
	Status bool `name:"enable"`
}

type PunishSminerResponse struct {
	Code int              `json:"code"`
	Msg  string           `json:"msg"`
	Data PunishSminerList `json:"data"`
}

type PunishSminerList struct {
	Content []PunishSminerData `json:"content"`
	Count   int                `json:"count"`
}

type PunishSminerData struct {
	BlockId       uint32 `json:"block_id"`
	ExtrinsicHash string `json:"extrinsic_hash"`
	ExtrinsicName string `json:"extrinsic_name"`
	BlockHash     string `json:"block_hash"`
	Account       string `json:"account"`
	RecvAccount   string `json:"recv_account"`
	Amount        string `json:"amount"`
	Type          uint8  `json:"type"` // 1:not submit service proof 2:service proof result is false
	Timestamp     int64  `json:"timestamp"`
}
