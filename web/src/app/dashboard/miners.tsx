import React, { Fragment, useState } from "react";
import MinerDescription from "@/app/components/description";
import { unixTimestampToDateFormat } from "@/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export interface HostModel {
  Host: string;
  MinerInfoList: MinerInfoListModel[];
}

interface HostProp {
  host: HostModel;
}

interface ConfModel {
  App: AppConfig;
  Chain: ChainConfig;
}

interface AppConfig {
  Workspace: string;
  Port: number;
  MaxUseSpace: number;
  Cores: number;
  APIEndpoint: string;
}

interface ChainConfig {
  Mnemonic: string;
  StakingAcc: string;
  EarningsAcc: string;
  RPCs: string[];
  TEEs: string[];
  Timeout: number;
}

// CInfo container info
interface CInfoModel {
  id: string;
  names: string[];
  name: string;
  image: string;
  image_id: string;
  command: string;
  created: number;
  state: string;
  status: string;
  cpu_percent: string;
  memory_percent: string;
  mem_usage: string;
}

// Miner Stat
interface MinerStatModel {
  peer_id: string;
  collaterals: BigInt;
  debt: number;
  status: string;
  declaration_space: number;
  idle_space: number;
  service_space: number;
  lock_space: number;
  is_punished: PunishmentModel;
  total_reward: number;
  reward_issued: number;
}

interface PunishmentModel {
  block_id: number;
  extrinsic_hash: string;
  extrinsic_name: string;
  block_hash: string;
  account: string;
  recv_account: string;
  amount: string;
  type: number;
  timestamp: number;
}

export interface MinerInfoListModel {
  SignatureAcc: string;
  Conf: ConfModel;
  CInfo: CInfoModel;
  MinerStat: MinerStatModel;
}

function naturalSort(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    let result = 0;
    if (aPart !== bPart) {
      const aIsNumber = !isNaN(Number(aPart));
      const bIsNumber = !isNaN(Number(bPart));

      if (aIsNumber && bIsNumber) {
        result = Number(aPart) - Number(bPart);
      } else {
        result = aPart.localeCompare(bPart);
      }
    }
    if (result !== 0) {
      return result;
    }
  }
  return aParts.length - bParts.length;
}

export default function Miners({ host }: HostProp) {
  const emptyConf = {} as MinerInfoListModel;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMiner, setSelectedMiner] = useState<MinerInfoListModel>(emptyConf);

  const showDialog = (miner: MinerInfoListModel) => {
    setSelectedMiner(miner);
    setIsDialogOpen(true);
  };

  const sortedMiners = host?.MinerInfoList?.sort((a, b) =>
    naturalSort(a.SignatureAcc, b.SignatureAcc)
  ) || [];

  return (
    <Fragment>
      <section className="pl-12 pr-4 pt-0 bg-white dark:bg-black font-mono transition-colors duration-300">
        <div className="py-8 px-4 mx-auto max-w-full">
          <div
            key={host?.Host}
            className="mb-8 p-4 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700
                                  bg-white dark:bg-gray-600 transition-colors duration-300"
          >
            <h1 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400 transition-colors duration-300">
              <span className="px-2 text-white bg-blue-900 rounded dark:bg-blue-700 transition-colors duration-300">Host</span>
              &nbsp;&nbsp; {host?.Host ? host.Host : "Unknown"}
            </h1>
            <div className="w-full">
              <div className="overflow-x-auto w-full">
                <div className="rounded-lg overflow-hidden">
                  <Table className="border-separate border-spacing-0 w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300
                                                                    rounded-tl-lg">
                          Signature Account
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Status
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Declaration Space
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Idle Space
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Used Space
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Total Reward
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300">
                          Claimed Reward
                        </TableHead>
                        <TableHead className="text-center border border-gray-200 dark:border-gray-700 font-bold text-sm uppercase
                                                                    tracking-wider text-black dark:text-white py-3 px-4 transition-colors duration-300
                                                                    rounded-tr-lg">
                          Create Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMiners.map((miner, index) => (
                        <TableRow
                          key={miner.SignatureAcc}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
                        >
                          <TableCell className={`border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white 
                                                                        transition-colors duration-300 ${index === sortedMiners.length - 1 ? "rounded-bl-lg" : ""}`}>
                                                        <span
                                                          className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline transition-colors duration-300"
                                                          onClick={() => showDialog(miner)}
                                                        >
                                                            {miner.SignatureAcc}
                                                        </span>
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.status === "positive" ? (
                              <Badge className="bg-green-500 hover:bg-green-600 transition-colors duration-300">
                                <p className="text-black dark:text-white">Running</p>
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 hover:bg-red-600 transition-colors duration-300">
                                <p className="text-black dark:text-white">Stop</p>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.declaration_space}
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.idle_space}
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.service_space}
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.total_reward}
                          </TableCell>
                          <TableCell className="text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white transition-colors duration-300">
                            {miner.MinerStat.reward_issued}
                          </TableCell>
                          <TableCell className={`text-center border border-gray-200 dark:border-gray-700 p-4 text-black dark:text-white 
                                                                        transition-colors duration-300 ${index === sortedMiners.length - 1 ? "rounded-br-lg" : ""}`}>
                            {unixTimestampToDateFormat(miner.CInfo.created)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogContent className="w-[80%] max-w-[1200px] bg-white dark:bg-gray-800 font-mono text-black dark:text-white rounded-lg transition-colors duration-300">
                    <MinerDescription miner={selectedMiner} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
}