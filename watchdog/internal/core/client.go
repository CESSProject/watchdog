package core

import (
	"context"
	"fmt"
	"github.com/CESSProject/cess-go-sdk/chain"
	_ "github.com/CESSProject/cess-go-sdk/chain"
	"github.com/CESSProject/cess-go-sdk/utils"
	"github.com/CESSProject/watchdog/constant"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/centrifuge/go-substrate-rpc-client/v4/signature"
	"github.com/docker/docker/api/types"
	"math/rand"
	"strings"
	"sync"
	"time"
)

var exeConf = types.ExecConfig{
	Cmd:          []string{"cat", "config.yaml"},
	WorkingDir:   "/opt/miner/",
	AttachStdout: true,
	AttachStderr: true,
}

// BlockDataManager manages a shared BlockDataList for all WatchdogClients
// using a FIFO queue structure
type BlockDataManager struct {
	BlockDataList []chain.BlockData // Chain block data list, shared among all clients, acts as a FIFO queue
	blockDataMap  map[uint64]bool   // Map to track which blocks are already in the queue
	mutex         sync.RWMutex      // Mutex for protecting BlockDataList and blockDataMap
	chainClient   *util.CessChainClient
	maxQueueSize  int    // Maximum number of blocks to maintain in the queue
	latestBlock   uint64 // Latest known block number
	active        bool
	initialized   bool // Flag to indicate if queue has been initially populated
}

// GlobalBlockDataManager Global block data manager instance
var GlobalBlockDataManager *BlockDataManager

type WatchdogClient struct {
	Host                  string                // 127.0.0.1 or some ip else
	*Client                                     // docker cli
	*util.HTTPClient                            // http cli
	*util.CessChainClient                       // cess chain cli
	MinerInfoMap          map[string]*MinerInfo // key: miner-name
	Updating              bool                  // is miners data updating?
	Active                bool                  // sleep or run
	mutex                 sync.Mutex
}

var Clients = map[string]*WatchdogClient{} // key: hostIP

type MinerInfo struct {
	SignatureAcc string
	Conf         model.MinerConfigFile
	CInfo        model.Container
	MinerStat    model.MinerStat
}

// InitBlockDataManager initializes the global block data manager with a queue structure
func InitBlockDataManager(interval int) {
	if GlobalBlockDataManager != nil {
		return
	}

	// Initialize the block data manager with chain client
	chainClient := util.NewCessChainClient([]string{constant.LocalRpcUrl, constant.DefaultRpcUrl})

	// Calculate queue size based on interval and block generation time
	maxQueueSize := interval / constant.GenBlockInterval
	if maxQueueSize <= 0 {
		maxQueueSize = 1 // At least 1 block
	}

	GlobalBlockDataManager = &BlockDataManager{
		BlockDataList: make([]chain.BlockData, 0, maxQueueSize),
		blockDataMap:  make(map[uint64]bool),
		chainClient:   chainClient,
		maxQueueSize:  maxQueueSize,
		latestBlock:   0,
		active:        true,
		initialized:   false,
	}

	// Initial population of the queue
	if err := GlobalBlockDataManager.initialQueuePopulation(); err != nil {
		log.Logger.Warnf("Error during initial queue population: %v", err)
	}

	// Start the block watcher
	go GlobalBlockDataManager.watchNewBlocks()

	log.Logger.Infof("Global Block Data Manager initialized successfully with queue size of %d blocks", maxQueueSize)
}

// initialQueuePopulation fills the queue with initial block data
func (bdm *BlockDataManager) initialQueuePopulation() error {
	// Get the latest block number
	latestBlockNumber, err := bdm.chainClient.CessClient.QueryBlockNumber("")
	if err != nil {
		return fmt.Errorf("failed to query block number during initialization: %w", err)
	}

	latestBlockNum := uint64(latestBlockNumber)
	bdm.latestBlock = latestBlockNum
	log.Logger.Infof("Init block queue with the latest block number: %d", latestBlockNum)

	// Calculate the starting block number
	startBlockNum := int64(latestBlockNum) - int64(bdm.maxQueueSize) + 1
	if startBlockNum < 1 {
		startBlockNum = 1
	}

	// Populate the queue with historical blocks
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	log.Logger.Infof("start to fetch block data from %s", bdm.chainClient.CessClient.GetCurrentRpcAddr())
	for i := startBlockNum; i <= int64(latestBlockNum); i++ {
		blockNum := uint64(i)
		data, err := bdm.chainClient.CessClient.ParseBlockData(blockNum)
		if err != nil {
			log.Logger.Warnf("Failed to parse block data for block %d during initialization: %v", blockNum, err)
			continue
		}

		bdm.BlockDataList = append(bdm.BlockDataList, data)
		bdm.blockDataMap[blockNum] = true
		if i%100 == 0 {
			log.Logger.Infof("Fetch block data from %s, current block num %d", bdm.chainClient.CessClient.GetCurrentRpcAddr(), i)
		}
	}

	bdm.initialized = true
	log.Logger.Infof("Initial queue population complete with %d blocks from %d to %d",
		len(bdm.BlockDataList), startBlockNum, latestBlockNum)
	return nil
}

// watchNewBlocks continuously monitors for new blocks and adds them to the queue
func (bdm *BlockDataManager) watchNewBlocks() {
	// Wait for initial population to complete
	for !bdm.initialized {
		log.Logger.Info("Waiting for initial population to complete...")
		time.Sleep(constant.GenBlockInterval * time.Second)
	}

	checkInterval := time.Duration(constant.GenBlockInterval/2) * time.Second // 3s

	for bdm.active {
		// Query the latest block number
		latestBlockNumber, err := bdm.chainClient.CessClient.QueryBlockNumber("")
		if err != nil {
			log.Logger.Warnf("Failed to query latest block number: %v", err)
			time.Sleep(checkInterval)
			continue
		}

		latestBlockNum := uint64(latestBlockNumber)

		// Check if there are new blocks
		if latestBlockNum > bdm.latestBlock {
			// Process each new block
			for blockNum := bdm.latestBlock + 1; blockNum <= latestBlockNum; blockNum++ {
				if err := bdm.processNewBlock(blockNum); err != nil {
					log.Logger.Warnf("Failed to process new block %d: %v", blockNum, err)
				}
			}

			// Update the latest block number
			bdm.latestBlock = latestBlockNum
		}

		// Wait a bit before checking again
		time.Sleep(checkInterval)
	}
}

// processNewBlock fetches and processes a new block, adding it to the queue
func (bdm *BlockDataManager) processNewBlock(blockNum uint64) error {
	// Fetch block data
	data, err := bdm.chainClient.CessClient.ParseBlockData(blockNum)
	if err != nil {
		return fmt.Errorf("failed to parse block data for block %d: %w", blockNum, err)
	}

	// Add the new block to the queue
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	// If the queue is already at max size, remove the oldest block
	if len(bdm.BlockDataList) >= bdm.maxQueueSize && len(bdm.BlockDataList) > 0 {
		oldestBlock := bdm.BlockDataList[0]
		blockNumToRemove := uint64(oldestBlock.BlockId)

		// Remove the oldest block
		bdm.BlockDataList = bdm.BlockDataList[1:]
		delete(bdm.blockDataMap, blockNumToRemove)

		log.Logger.Debugf("Removed oldest block %d from queue", blockNumToRemove)
	}

	// Add the new block
	bdm.BlockDataList = append(bdm.BlockDataList, data)
	bdm.blockDataMap[blockNum] = true
	if int(bdm.latestBlock)%10 == 0 { // Print every 10 blocks (1min)
		log.Logger.Infof("Save block data from %s, current block num %d", bdm.chainClient.CessClient.GetCurrentRpcAddr(), bdm.latestBlock)
	}

	log.Logger.Debugf("Added new block %d to queue, queue size now: %d", blockNum, len(bdm.BlockDataList))
	return nil
}

// GetBlockDataList returns a copy of the current block data queue
func (bdm *BlockDataManager) GetBlockDataList() []chain.BlockData {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	// Create a copy to avoid concurrent modification
	result := make([]chain.BlockData, len(bdm.BlockDataList))
	copy(result, bdm.BlockDataList)
	return result
}

// GetQueueStatus returns the current status of the block data queue
func (bdm *BlockDataManager) GetQueueStatus() (int, uint64, uint64) {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	queueSize := len(bdm.BlockDataList)
	var oldestBlock, newestBlock uint64

	if queueSize > 0 {
		oldestBlock = uint64(bdm.BlockDataList[0].BlockId)
		newestBlock = uint64(bdm.BlockDataList[queueSize-1].BlockId)
	}

	return queueSize, oldestBlock, newestBlock
}

func InitWatchdogClients(conf model.YamlConfig) error {
	// Initialize the global block data manager first
	InitBlockDataManager(conf.ScrapeInterval)

	hosts := conf.Hosts
	Clients = make(map[string]*WatchdogClient, len(hosts))
	var initClientsWG sync.WaitGroup
	errChan := make(chan error, len(hosts))
	for _, host := range hosts {
		initClientsWG.Add(1)
		go func(host model.HostItem) {
			defer initClientsWG.Done()
			dockerClient, err := NewClient(host)
			if dockerClient == nil {
				return
			}
			if err != nil {
				errChan <- err
				return
			}

			httpClient := util.NewHTTPClient()
			chainClient := util.NewCessChainClient([]string{constant.LocalRpcUrl, constant.DefaultRpcUrl})

			Clients[host.IP] = &WatchdogClient{
				Host:            host.IP,
				Client:          dockerClient,
				HTTPClient:      httpClient,
				CessChainClient: chainClient,
				MinerInfoMap:    make(map[string]*MinerInfo),
				Updating:        false,
				Active:          true,
			}
			log.Logger.Infof("Create a docker client with host: %s successfully", host.IP)
		}(host)
	}
	initClientsWG.Wait()
	close(errChan)
	for err := range errChan {
		if err != nil {
			return err
		}
	}
	log.Logger.Info("Init All Watchdog Clients Successfully")
	return nil
}

func RunWatchdogClients(conf model.YamlConfig) error {
	for hostIp, client := range Clients {
		if client == nil {
			log.Logger.Warnf("Client for host %s is nil, skipping", hostIp)
			continue
		}
		log.Logger.Infof("Start to run task at host: %s", hostIp)
		go client.RunWatchdogClient(conf)
	}
	return nil
}

func (cli *WatchdogClient) RunWatchdogClient(conf model.YamlConfig) {
	for cli.Active {
		log.Logger.Info("Start to run watchdog client")
		if err := cli.start(conf); err != nil {
			log.Logger.Warnf("Error when start %s watchdog client %v", cli.Host, err)
		}
		time.Sleep(time.Duration(CustomConfig.ScrapeInterval) * time.Second) // Scrape interval
	}
}

func (cli *WatchdogClient) start(conf model.YamlConfig) error {
	// Make sure each client does not start at the same time to prevent from being overloaded
	SleepAFewSeconds()
	cli.Updating = true
	defer func() { cli.Updating = false }()
	ctx := context.Background()
	containers, err := cli.Client.ListContainers(ctx, cli.Host)

	if err != nil {
		log.Logger.Errorf("Error when listing %s containers: %v", cli.Host, err)
		return err
	}

	errChan := make(chan error, len(containers))
	done := make(chan struct{})
	go func() {
		for err := range errChan {
			log.Logger.Errorf("Error when %s task run: %v", cli.Host, err)
		}
		close(done)
	}()

	// Get miner info and miner config
	var setContainersDataWG sync.WaitGroup
	for _, container := range containers {
		if !strings.Contains(container.Image, constant.MinerImage) {
			continue
		}
		runningMiners := make(map[string]bool)
		for _, v := range containers {
			runningMiners[v.ID] = true
		}

		// clean miner if it is not running
		for key, value := range cli.MinerInfoMap {
			if !runningMiners[value.CInfo.ID] {
				log.Logger.Infof("Miner %s on host: %v has been stopped or removed, delete it from current task", key, cli.Host)
				delete(cli.MinerInfoMap, key)
			}
		}
		setContainersDataWG.Add(1)
		go func(container model.Container) {
			defer setContainersDataWG.Done()
			// send alert by webhook when parse config file failed
			if err := cli.setMinerInfoMapItem(ctx, container, cli.Host); err != nil {
				errChan <- err
			}
		}(container)
	}
	setContainersDataWG.Wait()

	// Set miners' container stats
	var setContainersStatsDataWG sync.WaitGroup
	for _, miner := range cli.MinerInfoMap {
		setContainersStatsDataWG.Add(1)
		go func(m *MinerInfo) {
			defer setContainersStatsDataWG.Done()
			// send alert by webhook when get container stats failed
			if res, err := cli.SetContainerStats(ctx, m.CInfo.ID, cli.Host); err != nil {
				errChan <- err
			} else {
				m.CInfo.CPUPercent = res.CPUPercent
				m.CInfo.MemoryPercent = res.MemoryPercent
				m.CInfo.MemoryUsage = res.MemoryUsage
			}
		}(miner)
	}
	setContainersStatsDataWG.Wait()

	// Set miner's info on chain
	for _, miner := range cli.MinerInfoMap {
		SleepAFewSeconds()
		// send alert by webhook and email when storage node get punishment
		if minerStat, err := cli.SetChainData(miner.SignatureAcc, miner.CInfo.Created); err != nil {
			errChan <- err
		} else {
			if _, exists := cli.MinerInfoMap[miner.SignatureAcc]; exists {
				cli.MinerInfoMap[miner.SignatureAcc].MinerStat = minerStat
			} else {
				log.Logger.Error("Miner name does not match with conf file, please check your mineradm config file")
			}
		}
	}

	close(errChan)
	<-done
	return nil
}

func SleepAFewSeconds() {
	source := rand.NewSource(time.Now().UnixNano())
	r := rand.New(source)
	sleepDuration := r.Intn(10) + 1
	time.Sleep(time.Duration(sleepDuration) * time.Second)
}

// GetBlockDataList for WatchdogClient now uses the global block data manager
func (cli *WatchdogClient) GetBlockDataList() []chain.BlockData {
	return GlobalBlockDataManager.GetBlockDataList()
}

func (cli *WatchdogClient) setMinerInfoMapItem(ctx context.Context, cinfo model.Container, hostIp string) error {
	if _, ok := cli.MinerInfoMap[cinfo.Name]; ok {
		return nil
	}

	res, err := cli.ExeCommand(ctx, cinfo.ID, exeConf, cli.Host)
	if err != nil {
		log.Logger.Errorf("%s read config from container path: %s failed in host: %s", cinfo.Name, constant.MinerConfPath, cli.Host)
		return err
	}

	// res:
	//[1 0 0 0 0 0 1 179 78 97 109 101 58 32 109 105
	//110 101 114 49 13 10 80 111 114 116 58 32 49 53
	//48 48 49 13 10 69 97 114 110 105 110 103 115 65
	//114 46 98 111 111 116 45 109 105 110 101 114 45
	//100 101 118 110 101 116 46 99 101 115 115 46 99]

	// Data format explanation:
	// First byte: stream data type (0x01 for stdout, 0x02 for stderr)
	// Bytes 2-4: Reserved (not used)
	// Bytes 5-8: 32-bit integer representing the length of the following data block

	conf, err := util.ParseMinerConfigFile(res[8:]) // Skip header bytes (0-7)
	if err != nil {
		SleepAFewSeconds() // avoid webhook/smtp server api request limit
		log.Logger.Errorf("Failed to parse storage node config file for container %s: %v on host: %s", cinfo.ID, err, cli.Host)
		go doAlert(hostIp, fmt.Sprintf("Failed to parse storage node config file for container %s: %v on host: %s", cinfo.ID, err, cli.Host), "", cinfo.ID, GlobalBlockDataManager.latestBlock)
		return err
	}

	key, err := signature.KeyringPairFromSecret(conf.Chain.Mnemonic, 0)
	if err != nil {
		log.Logger.Errorf("Failed to generate keyring pair for container %s: %v", cinfo.Name, err)
		return err
	}

	acc, err := utils.EncodePublicKeyAsCessAccount(key.PublicKey)
	if err != nil {
		log.Logger.Errorf("Failed to encode public key as Cess account for container %s: %v", cinfo.Name, err)
		return err
	}

	cli.mutex.Lock()
	defer cli.mutex.Unlock()

	cli.MinerInfoMap[acc] = &MinerInfo{
		SignatureAcc: acc,
		CInfo:        cinfo,
		Conf:         conf,
		MinerStat:    model.MinerStat{},
	}

	return nil
}

func doAlert(hostIP string, message string, signatureAcc string, containerID string, blockNumber uint64) {
	if !CustomConfig.Alert.Enable {
		return
	}
	content := model.AlertContent{
		AlertTime:    time.Now().Format(constant.TimeFormat),
		HostIp:       hostIP,
		Description:  message,
		SignatureAcc: signatureAcc,
		ContainerID:  containerID,
		BlockNumber:  blockNumber,
	}
	if WebhooksConfig != nil {
		go func() {
			if err := WebhooksConfig.SendAlertToWebhook(content); err != nil {
				log.Logger.Error("Failed to send alert webhook:", err)
			} else {
				log.Logger.Infof("Webhook alert sent successfully: %v", content)
			}
		}()
	}
	if SmtpConfig != nil {
		go func() {
			if err := SmtpConfig.SendMail(content); err != nil {
				log.Logger.Error("Failed to send alert email:", err)
			} else {
				log.Logger.Info("Email alert sent successfully")
			}
		}()
	}
}
