package core

import (
	"fmt"
	"github.com/CESSProject/cess-go-sdk/chain"
	"github.com/CESSProject/cess-go-sdk/utils"
	"github.com/CESSProject/watchdog/internal/log"
	"github.com/CESSProject/watchdog/internal/model"
	"github.com/CESSProject/watchdog/internal/util"
	"github.com/centrifuge/go-substrate-rpc-client/v4/types"
	"time"

	"github.com/pkg/errors"
)

func (cli *WatchdogClient) SetChainData(signatureAcc string, created int64) (model.MinerStat, error) {
	var stat model.MinerStat
	hostIP := cli.Host
	if hostIP == "" {
		hostIP = "127.0.0.1"
	}

	publicKey, err := utils.ParsingPublickey(signatureAcc)
	if err != nil {
		return model.MinerStat{}, errors.Wrap(err, "error occurred when parse public key")
	}

	chainInfo, err := cli.CessChainClient.CessClient.QueryMinerItems(publicKey, -1)
	if err != nil {
		return model.MinerStat{}, errors.Wrap(err, "error occurred when query minerSignatureAcc stat from chain")
	}

	stat, err = util.TransferMinerInfoToMinerStat(chainInfo)
	if err != nil {
		log.Logger.Errorf("%s %s failed to transfer object format", hostIP, signatureAcc)
		return model.MinerStat{}, err
	}

	latestBlockNumber, err := cli.CessChainClient.CessClient.QueryBlockNumber("")
	if err != nil {
		log.Logger.Errorf("%s %s failed to query latest block", hostIP, signatureAcc)
		return stat, errors.Wrap(err, "failed to query latest block")
	}

	if stat.Status != "positive" && time.Now().Unix()-created > 1800 {
		// do not alert if the miner are firstly created and not active
		go doAlert(hostIP, fmt.Sprintf("Host: %s, The Status of Storage Node %s on chain is not a positive status", cli.Host, signatureAcc), signatureAcc, "", uint64(latestBlockNumber))
	}

	reward, err := cli.CessChainClient.CessClient.QueryRewardMap(publicKey, -1)
	if err != nil {
		log.Logger.Errorf("%s %s failed to query reward from chain", hostIP, signatureAcc)
		return stat, errors.Wrap(err, "failed to query reward from chain")
	}
	stat.TotalReward = util.BigNumConversion(types.U128(reward.TotalReward))
	stat.RewardIssued = util.BigNumConversion(types.U128(reward.RewardIssued))

	stat.LatestPunishInfo = getMinerPunishInfo(GlobalBlockDataManager.BlockDataList, signatureAcc)

	return stat, nil
}

func getMinerPunishInfo(blockDataList []chain.BlockData, signatureAcc string) []model.PunishSminerData {
	var latestPunishInfo []model.PunishSminerData
	for _, blockData := range blockDataList {
		for _, punish := range blockData.Punishment {
			if punish.From == signatureAcc {
				go doAlert("", fmt.Sprintf("%s get punishment at block %d", signatureAcc, blockData.BlockId), signatureAcc, "", uint64(blockData.BlockId))
				punishData := model.PunishSminerData{
					BlockId:       blockData.BlockId,
					ExtrinsicHash: punish.ExtrinsicHash,
					ExtrinsicName: punish.ExtrinsicName,
					BlockHash:     blockData.BlockHash,
					Account:       punish.From,
					RecvAccount:   punish.To,
					Amount:        punish.Amount,
					Timestamp:     blockData.Timestamp,
				}
				latestPunishInfo = append(latestPunishInfo, punishData)
			}
		}
	}
	return latestPunishInfo
}
