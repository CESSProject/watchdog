export const MinersSample = [
    {
        Host: "127.0.0.1",
        MinerInfoList: [
            {
                Name: "miner1-demo",
                SignatureAcc: "cXhbtbtB94mc5JFCVGXKCYz75ttWsSJ2ifWXRdRGTTe3pjQDf",
                Conf: {
                    Name: "miner1",
                    Port: 15001,
                    EarningsAcc: "cXjmhVMVak1mFG3jgK2Nj9KG6HAo41vH5uZzCS7gKV9g5Rfpb",
                    StakingAcc: "cXhLrzUA1BVu9HmDFZKWLKDJvvFk4fmy2JTvRGGNvD4qN4ura",
                    Mnemonic: "",
                    Rpc: ["ws://111.111.111.111:9947/"],
                    UseSpace: 50,
                    Workspace: "/opt/miner-disk",
                    UseCpu: 1,
                    TeeList: ["127.0.0.1:8080", "127.0.0.1:8081"],
                    Boot: ["_dnsaddr.boot-miner-devnet.cess.cloud"]
                },
                CInfo: {
                    id: "06c3a73480beb6f5cc0980b417cb6fe50d4d00523c04ecee7fa4e81c07803e2c",
                    names: ["/miner1"],
                    name: "miner1",
                    image: "cesslab/cess-miner:devnet",
                    image_id:
                        "sha256:81e7ce91d51c9dcedd6f6a7ff47b9909d713563fb36565ba9d5e156608212f02",
                    command: "cess-bucket run -c /opt/miner/config.yaml",
                    created: 1718609455,
                    state: "running",
                    status: "Up 2 days (healthy)",
                    cpu_percent: 0.09462686567164179,
                    memory_percent: 65.0955894142814,
                    mem_usage: 10908557312
                },
                MinerStat: {
                    peer_id: "12D3KooWAxvCokRK1MCmBLCsjYjBYitjgZ3cmpAGAoC2GWrYQARn",
                    collaterals: BigInt("12000000000000000000000"),
                    debt: 0,
                    status: "positive",
                    declaration_space: 1099511627776,
                    idle_space: 34359738368,
                    service_space: 0,
                    lock_space: 0,
                    is_punished: [],
                    total_reward: 122121211212122,
                    reward_issued: 1213123132132123
                }
            },
            {
                Name: "miner2-demo",
                SignatureAcc: "cXkZ6AvHTf3sozwkkXPPuMm1JjqUvoRFyjJh381zY8PLADixR",
                Conf: {
                    Name: "miner2",
                    Port: 15002,
                    EarningsAcc: "cXf7eCg6CXvjTf6bpw1CJ24q8sk8jM2cWA1beQRH9YpktMCcY",
                    StakingAcc: "cXjNKYNWwGg4cCzjgeQLJxEjhebr2Hd5SXibhLdFiA1hTnggC",
                    Mnemonic: "",
                    Rpc: ["ws://111.111.111.111:9947/"],
                    UseSpace: 100,
                    Workspace: "/opt/miner-disk",
                    UseCpu: 1,
                    TeeList: ["127.0.0.1:8080", "127.0.0.1:8081"],
                    Boot: ["_dnsaddr.boot-miner-devnet.cess.cloud"]
                },
                CInfo: {
                    id: "95f2843d4101ea8290fe1915ab054191893f4ec5ad0dcae438b271a72be4fda4",
                    names: ["/miner2"],
                    name: "miner2",
                    image: "cesslab/cess-miner:devnet",
                    image_id:
                        "sha256:81e7ce91d51c9dcedd6f6a7ff47b9909d713563fb36565ba9d5e156608212f02",
                    command: "cess-bucket run -c /opt/miner/config.yaml",
                    created: 1718609455,
                    state: "running",
                    status: "Up 2 days (healthy)",
                    cpu_percent: 0.25415841584158416,
                    memory_percent: 0.42065404003863854,
                    mem_usage: 70492160
                },
                MinerStat: {
                    earning_acc:
                        "0x0616894a08496f0d288224589ce7342ac2f4c2a3044151a507d349200bbffb04",
                    staking_acc:
                        "0xc23955ace5277df49d56c517113f36d1d03c3f39b4d087cf759afeac15206767",
                    peer_id: "12D3KooWPbeKx9FJwJnncanCKscGMBiEznwA44y7iP8xYB2QAQmr",
                    collaterals: BigInt("12000000000000000000000"),
                    debt: 0,
                    status: "positive",
                    declaration_space: 1099511627776,
                    idle_space: 85899345920,
                    service_space: 0,
                    lock_space: 0,
                    is_punished: [],
                    total_reward: 122121211212122,
                    reward_issued: 1213123132132123
                }
            }
        ]
    }
];


export const ConfType = `{
  "alert": {
    "email": {
      "receiver": [
        "string",
        "string"
      ],
      "senderAddr": "string",
      "smtpEndpoint": "string",
      "smtpPassword": "string",
      "smtpPort": number
    },
    "enable": boolean,
    "webhook": [
      "string",
      "string"
    ]
  },
  "hosts": [
    {
      "capath": "string",
      "certPath": "string",
      "ip": "string",
      "keyPath": "string",
      "port": "string"
    }
  ],
  "scrapeInterval": number
}`;

export const ConfSample = `{
  "scrapeInterval": 30,
  "hosts": [
    {
      "ip": "127.0.0.1",
      "port": "2375"
    },
    {
      "ip": "84.247.176.100",
      "port": "2375",
      "ca_path": "/etc/docker/84.247.176.100/ca.pem",
      "cert_path": "/etc/docker/84.247.176.100/cert.pem",
      "key_path": "/etc/docker/84.247.176.100/key.pem"
    }
  ],
  "alert": {
    "enable": true,
    "webhook": [
      "https://open.larksuite.com/open-apis/bot/v2/hook/*"
    ],
    "email": {
      "smtp_endpoint": "smtpdm-ap-1.aliyuncs.com",
      "smtp_port": 80,
      "smtp_account": "autome@cess.cloud",
      "smtp_password": "***********",
      "receiver": [
        "z1092280043@gmail.com"
      ]
    }
  }
}`;