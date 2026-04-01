import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, FileDown, Wand2, PlayCircle, TableProperties } from 'lucide-react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Shot {
  shotNumber: string;
  characters: string;
  scene: string;
  duration: number;
  aiDescription: string;
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
1. 镜号：格式为1-1、1-2、2-1等。假设当前是第1集，从1-1开始。
2. 人物：对应镜号中出现的主体人物。
3. 场景：对应镜号发生的场景。
4. 时长：单位为秒，必须在3~8秒之间。
5. 分镜AI描述词：必须包含“主体占位”、“景别”、“运镜”、“构图”、“描述”五个部分。其中主体要用名字全称，不能用代词（她、他）。需要将抽象的旁白转化为具体、可拍摄的视觉描述（例如：“他们踩着我的尸骨身价过亿”转化为“江浩宇与夏如烟举起手中的红酒杯碰杯，两人脸上带着得意的笑容，背景是一处豪华的宴会大厅”）。
6. 旁白：直接根据原文拆分，**绝对不能省略或修改任何文字，必须一字不改**。必须覆盖全部输入文本，不能遗漏。
7. 音画同步要求：解说语速是每秒7个字。请严格根据旁白字数计算时长（四舍五入到整数），并确保每个分镜的时长在3~8秒之间。因此，每次拆分的旁白字数需要控制在合理范围内。

输入剧本：
${script}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                shotNumber: { type: Type.STRING, description: "镜号，如 1-1" },
                characters: { type: Type.STRING, description: "主体人物" },
                scene: { type: Type.STRING, description: "场景" },
                duration: { type: Type.NUMBER, description: "时长(秒)，3到8之间" },
                aiDescription: { type: Type.STRING, description: "分镜AI描述词，包含主体占位、景别、运镜、构图、描述。请分行输出，例如：\\n主体占位：...\\n景别：...\\n运镜：...\\n构图：...\\n描述：..." },
                voiceover: { type: Type.STRING, description: "旁白，一字不改的原文拆分" }
              },
              required: ["shotNumber", "characters", "scene", "duration", "aiDescription", "voiceover"]
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

  const exportToCSV = () => {
    if (shots.length === 0) return;
    
    const headers = ['镜号', '人物', '场景', '时长', '分镜AI描述词', '旁白'];
    const csvContent = [
      headers.join(','),
      ...shots.map(shot => [
        `"${shot.shotNumber}"`,
        `"${shot.characters.replace(/"/g, '""')}"`,
        `"${shot.scene.replace(/"/g, '""')}"`,
        shot.duration,
        `"${shot.aiDescription.replace(/"/g, '""')}"`,
        `"${shot.voiceover.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'script_breakdown.csv');
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
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            导出 CSV
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
                    <th className="p-4 font-semibold min-w-[300px] border-r border-gray-100">分镜AI描述词</th>
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
                        {shot.aiDescription}
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
