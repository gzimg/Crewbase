import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconBriefcase } from "@tabler/icons-react";

type props = { triggerToast: typeof toast };

/** Feature flag: the Staffing section (on by default). */
const Staffing: FC<props> = (props) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const enabled = (workspace.settings as any)?.staffingEnabled !== false;

  const toggle = async () => {
    try {
      await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/staffing`, { enabled: !enabled });
      const obj = JSON.parse(JSON.stringify(workspace, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
      obj.settings.staffingEnabled = !enabled;
      setWorkspace(obj);
      props.triggerToast.success(!enabled ? "Staffing turned on" : "Staffing turned off");
    } catch {
      props.triggerToast.error("Couldn’t update Staffing.");
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <IconBriefcase size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Staffing</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Open positions, hiring pipeline, interviews, headcount and availability</p>
        </div>
      </div>
      <SwitchComponenet checked={enabled} onChange={toggle} label="" classoverride="mt-0" />
    </div>
  );
};

Staffing.title = "Staffing";

export default Staffing;
