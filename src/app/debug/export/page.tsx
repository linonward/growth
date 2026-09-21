"use client";

import { useMemo, useState } from "react";

import { ageBandLabel } from "@/domain/age-band";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * /debug/export — the manual experiment-data export (spec section 19).
 *
 * Kept as a page (not only a debug-panel action) so data can be pulled off a
 * device at the end of the 7 days without the panel being visible.
 */
export default function ExportPage() {
  const buildExport = usePrototypeStore((s) => s.buildExport);
  const [downloaded, setDownloaded] = useState(false);

  const payload = useMemo(() => buildExport(), [buildExport]);
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growth-experiment-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      data-testid="export-page"
    >
      <header className="px-5 pt-6">
        <h1 className="text-[20px] font-bold text-ink">实验数据导出</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          下载后可以把 JSON 交给实验负责人。
        </p>
      </header>

      <section className="px-5 pt-4" data-testid="export-summary">
        <div className="rounded-card bg-parchment px-4 py-4 text-[13px] text-ink-soft">
          <p>
            年龄组：
            <span
              className={`font-semibold ${
                payload.profile.ageBand ? "text-ink" : "text-[#b4552d]"
              }`}
              data-testid="export-age-band"
            >
              {ageBandLabel(payload.profile.ageBand)}
            </span>
          </p>
          {payload.profile.ageBand ? null : (
            <p className="mt-1 text-[12px] text-[#b4552d]">
              未记录年龄组 —— 这份数据无法按年龄分段。请在
              <span className="font-semibold">?debug=1</span>
              面板中补填后重新导出。
            </p>
          )}
          <p className="mt-1">
            打开次数：
            <span className="font-semibold text-ink">
              {payload.summary.appOpenedCount}
            </span>
          </p>
          <p className="mt-1">
            完成任务：
            <span className="font-semibold text-ink">
              {payload.summary.goalsCompleted}
            </span>
          </p>
          <p className="mt-1">
            自主 / 被提醒：
            <span className="font-semibold text-ink">
              {payload.summary.initiativeSelf} / {payload.summary.initiativePrompted}
            </span>
          </p>
          {/*
            The D8 window is the primary acceptance point, and it is a property
            of WHEN this file is taken — so the page has to say whether the file
            in hand can answer it. Silent zeros here would read as "nobody came
            back" when the truth is "Day 8 has not happened yet".
          */}
          <p className="mt-1">
            第 8 天及以后回访：
            <span
              className={`font-semibold ${
                payload.postWeek.daysActive > 0 ? "text-leaf-deep" : "text-ink-faint"
              }`}
              data-testid="export-post-week"
            >
              {payload.postWeek.daysActive > 0
                ? `${payload.postWeek.daysActive} 天（首次 D${payload.postWeek.firstDayActive}）`
                : "还没有"}
            </span>
          </p>
          {payload.postWeek.daysActive === 0 ? (
            <p className="mt-1 text-[12px] text-ink-soft">
              这是<span className="font-semibold">主验收点</span>
              ：7 天故事结束后还回不回来。请在参与者跑完 7 天之后
              <span className="font-semibold">再导出一次</span>
              —— 现在这份文件的 D8+ 一定还是 0。
            </p>
          ) : null}
          <p className="mt-1">
            继续意愿：
            <span className="font-semibold text-ink">
              {payload.summary.continueIntent ? "有" : "无"}
            </span>
          </p>
        </div>
      </section>

      <div className="px-5 pt-4">
        <button
          type="button"
          data-testid="export-download"
          onClick={download}
          className="cta w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
        >
          Download Experiment Data
        </button>
        {downloaded ? (
          <p
            className="mt-2 text-center text-[12px] text-leaf-deep"
            data-testid="export-done"
          >
            已开始下载
          </p>
        ) : null}
      </div>

      <pre
        className="mx-5 mt-5 mb-8 overflow-x-auto rounded-card bg-ink/90 p-4 text-[10px] leading-relaxed text-cream"
        data-testid="export-json"
      >
        {json}
      </pre>
    </div>
  );
}
