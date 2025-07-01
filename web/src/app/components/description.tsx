import React from 'react';
import { MinerInfoListModel } from "@/app/dashboard/miners";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Miner Description Component
 * Displays detailed information about a miner
 * @param {Object} props - Component props
 * @param {MinerInfoListModel} props.miner - Miner information to display
 */
const MinerDescription: React.FC<{ miner: MinerInfoListModel }> = ({ miner }) => {
  return (
    <div className="font-mono">
      <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Miner Information</h2>

      {/* Signature Account Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2 text-black dark:text-white">Signature Account</h3>
        <div className="p-3 border-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-base font-medium text-black dark:text-white">
            {miner.SignatureAcc}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Configuration Section */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
          <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-750">
            <CardTitle className="text-lg font-bold text-black dark:text-white">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <InfoItem label="Port" value={miner.Conf.App.Port.toString()} />
            <Separator className="my-3" />

            <InfoItem label="EarningsAcc" value={miner.Conf.Chain.EarningsAcc} />
            <Separator className="my-3" />

            <InfoItem label="StakingAcc" value={miner.Conf.Chain.StakingAcc} />
            <Separator className="my-3" />

            <InfoItem label="Rpc" value={miner.Conf.Chain.RPCs.join(", ")} />
            <Separator className="my-3" />

            <InfoItem label="Use Space" value={`${miner.Conf.App.MaxUseSpace} GiB`} />
            <Separator className="my-3" />

            <InfoItem label="Use Core" value={miner.Conf.App.Cores.toString()} />
          </CardContent>
        </Card>

        {/* Container Info Section */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
          <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-750">
            <CardTitle className="text-lg font-bold text-black dark:text-white">Container Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <InfoItem label="Container ID" value={miner.CInfo.id} />
            <Separator className="my-3" />

            <InfoItem label="Name" value={miner.CInfo.name} />
            <Separator className="my-3" />

            <InfoItem label="Status" value={miner.CInfo.state} />
            <Separator className="my-3" />

            <InfoItem label="Up Time" value={miner.CInfo.status} />
            <Separator className="my-3" />

            <InfoItem label="CPU Percent" value={`${miner.CInfo.cpu_percent}%`} />
            <Separator className="my-3" />

            <InfoItem label="Memory Usage" value={`${miner.CInfo.mem_usage} MiB`} />
            <Separator className="my-3" />

            <InfoItem label="Memory Usage" value={`${miner.CInfo.memory_percent}%`} />
          </CardContent>
        </Card>

        {/* Miner Statistics Section */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
          <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-750">
            <CardTitle className="text-lg font-bold text-black dark:text-white">Miner Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <InfoItem label="Status" value={miner.MinerStat.status} />
            <Separator className="my-3" />

            <InfoItem label="Declaration Space" value={miner.MinerStat.declaration_space.toString()} />
            <Separator className="my-3" />

            <InfoItem label="Idle Space" value={miner.MinerStat.idle_space.toString()} />
            <Separator className="my-3" />

            <InfoItem label="Service Space" value={miner.MinerStat.service_space.toString()} />
            <Separator className="my-3" />

            <InfoItem label="Total Reward" value={miner.MinerStat.total_reward.toString()} />
            <Separator className="my-3" />

            <InfoItem label="Claimed Reward" value={miner.MinerStat.reward_issued.toString()} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Info Item Component
 * Displays a label-value pair with enhanced visual distinction
 * @param {Object} props - Component props
 * @param {string} props.label - Label text
 * @param {string} props.value - Value text
 */
const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col space-y-1">
    {/* Enhanced label style with uppercase and distinct color */}
    <span className="text-xs uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">
      {label}
    </span>
    {/* Enhanced value style with larger font and clearer contrast */}
    <span className="text-base font-medium text-black dark:text-white break-all">
      {value}
    </span>
  </div>
);

export default MinerDescription;