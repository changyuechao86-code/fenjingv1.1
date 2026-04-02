import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, FileDown, Wand2, PlayCircle, TableProperties } from 'lucide-react';
import ExcelJS from 'exceljs';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Shot {
  shotNumber: string;
  characters: string;
  scene: string;
  duration: number;
  firstFramePrompt: string;
  videoChangePrompt: string;
  voiceover: string;
}

export default function App() {
  const [script, setScript] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('请输入剧本内容');
      return;
    }

    setLoading(true);
    setError('');
    setShots([]);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `你是一个专业的短剧/漫剧分镜拆解专家。请将以下剧本拆解为分镜。
要求：
1. 镜号：格式改成SH1-1、SH1-2、SH2-1、SH2-2等。假设当前是第1集，从SH1-1开始。
2. 人物：对应镜号中出现的主体人物。
3. 场景：对应镜号发生的场景。如果有多个场景，请用顿号“、”分隔，绝对不要出现与场景无关的描述词汇（例如：将“豪华宴会厅与医院病床对比场景”改为“豪华宴会厅、医院病床”）。
4. 时长：单位为秒，必须在3~8秒之间。
5. 首帧图：拆解后该镜号**起始静态画面**的AI生图提示词。注意：首帧图只描述动作发生前的初始静止状态，绝对不要包含连续动作（例如：如果剧情是“他猛地站起来”，首帧图应该是“明亮大气的路演会议室，江浩宇坐在观众席的第一排，表情嚣张跋扈”）。必须严格包含以下6项，并分行输出：
人物：[画面中出现的人物]
场景：[画面发生的场景]
主体占位：[描述主体在画面中的位置]
景别：[描述景别，如：全景/中景/近景/特写等]
构图：[描述构图，如：中心构图/三分法构图/对角线构图等]
描述：[具体、可拍摄的视觉描述，只描述初始静止状态]
6. 图像变化：根据该镜号的剧情，生成的图生视频AI提示词，用于描述从“首帧图”状态开始发生的动作和变化。必须在开头加上运镜描述，格式为“【运镜：xxx】”。比如主角的动作（接上例：“【运镜：镜头从下往上仰拍】江浩宇带着挑衅的笑容用力从椅子上站起……”）、环境、场景、特效等变化。核心的变化应该以主体的动作变化为主，需要详细描述。
7. 旁白：直接根据原文拆分，**绝对不能省略或修改任何文字，必须一字不改**。必须覆盖全部输入文本，不能遗漏。
8. 音画同步要求：解说语速是每秒7个字。请严格根据旁白字数计算时长（四舍五入到整数），并确保每个分镜的时长在3~8秒之间。因此，每次拆分的旁白字数需要控制在合理范围内。

输入剧本：
${script}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                shotNumber: { type: Type.STRING, description: "镜号，如 SH1-1" },
                characters: { type: Type.STRING, description: "主体人物" },
                scene: { type: Type.STRING, description: "场景，多个用顿号分隔" },
                duration: { type: Type.NUMBER, description: "时长(秒)，3到8之间" },
                firstFramePrompt: { type: Type.STRING, description: "首帧图AI生图提示词，必须严格包含人物、场景、主体占位、景别、构图、描述6项。请分行输出。" },
                videoChangePrompt: { type: Type.STRING, description: "图像变化AI提示词，开头必须是【运镜：xxx】，描述从首帧图开始发生的动作和合理变化" },
                voiceover: { type: Type.STRING, description: "旁白，一字不改的原文拆分" }
              },
              required: ["shotNumber", "characters", "scene", "duration", "firstFramePrompt", "videoChangePrompt", "voiceover"]
            }
          }
        }
      });

      if (response.text) {
        const parsedShots = JSON.parse(response.text);
        setShots(parsedShots);
      } else {
        setError('生成失败，未返回内容');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '生成过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (shots.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('分镜表');

    worksheet.columns = [
      { header: '镜号', key: 'shotNumber', width: 15 },
      { header: '人物', key: 'characters', width: 20 },
      { header: '场景', key: 'scene', width: 20 },
      { header: '时长', key: 'duration', width: 10 },
      { header: '首帧图', key: 'firstFramePrompt', width: 30 },
      { header: '图像变化', key: 'videoChangePrompt', width: 30 },
      { header: '旁白', key: 'voiceover', width: 40 }
    ];

    shots.forEach(shot => {
      const row = worksheet.addRow({
        shotNumber: shot.shotNumber,
        characters: shot.characters,
        scene: shot.scene,
        duration: shot.duration,
        firstFramePrompt: shot.firstFramePrompt,
        videoChangePrompt: shot.videoChangePrompt,
        voiceover: shot.voiceover
      });
      
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: 'top' };
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'script_breakdown.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Wand2 className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AI 剧本拆解工具</h1>
        </div>
        {shots.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            导出 Excel
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TableProperties className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">输入原剧本 / 解说词</h2>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="在此粘贴您的剧本或解说词原文...&#10;例如：他们踩着我的尸骨身价过亿,我却落得个抑郁而终的下场"
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-700 leading-relaxed"
          />
          
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p>
                <span className="font-medium text-blue-800">智能音画同步：</span>
                AI将按语速（每秒7字）自动拆分旁白，确保单镜时长在3~8秒之间，并将抽象描述转化为具体视觉画面。
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !script.trim()}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在拆解...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  开始拆解
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
        </div>

        {shots.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold w-20 border-r border-gray-100">镜号</th>
                    <th className="p-4 font-semibold w-32 border-r border-gray-100">人物</th>
                    <th className="p-4 font-semibold w-32 border-r border-gray-100">场景</th>
                    <th className="p-4 font-semibold w-20 border-r border-gray-100">时长</th>
                    <th className="p-4 font-semibold min-w-[250px] border-r border-gray-100">首帧图</th>
                    <th className="p-4 font-semibold min-w-[250px] border-r border-gray-100">图像变化</th>
                    <th className="p-4 font-semibold min-w-[200px]">旁白</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {shots.map((shot, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900 border-r border-gray-100 align-top">{shot.shotNumber}</td>
                      <td className="p-4 text-gray-700 border-r border-gray-100 align-top">{shot.characters}</td>
                      <td className="p-4 text-gray-700 border-r border-gray-100 align-top">{shot.scene}</td>
                      <td className="p-4 text-gray-700 border-r border-gray-100 align-top font-mono">{shot.duration}s</td>
                      <td className="p-4 text-gray-700 whitespace-pre-wrap leading-relaxed border-r border-gray-100 align-top">
                        {shot.firstFramePrompt}
                      </td>
                      <td className="p-4 text-gray-700 whitespace-pre-wrap leading-relaxed border-r border-gray-100 align-top">
                        {shot.videoChangePrompt}
                      </td>
                      <td className="p-4 text-gray-900 font-medium leading-relaxed align-top bg-gray-50/50">
                        {shot.voiceover}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
