import React, { useState, useContext } from 'react';
import { Send, Image, Loader2 } from 'lucide-react';
import { callAnthropic, callGoogle, callOpenAI } from '../lib/models';

// 型定義
interface ApiKeys {
  openai: string;
  anthropic: string;
  google: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

interface Mode {
  id: string;
  name: string;
  description: string;
}

// モックのコンテキスト（実際の実装では外部から提供される）
const imgContext = React.createContext<{
  apiKeys: ApiKeys;
  img: string;
}>({
  apiKeys: { openai: '', anthropic: '', google: '' },
  img: ''
});

const models: Model[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
];

const modes: Mode[] = [
  { id: 'formula', name: 'モード1：数式認識', description: '画像内の数式をLaTeXコードに変換' },
  { id: 'answer', name: 'モード2：問題回答', description: '画像内の問題に回答' },
  { id: 'explain', name: 'モード3：テキスト解説', description: '画像内のテキストを解説' },
  { id: 'translate', name: 'モード4：翻訳', description: '画像内の言語を指定言語に翻訳' },
  { id: 'question', name: 'モード5：質問', description: '画像について自由に質問' },
];

// OpenAI API呼び出し


const ImageAnalysisApp: React.FC = () => {
  const { apiKeys, img } = useContext(imgContext);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [selectedMode, setSelectedMode] = useState<string>('formula');
  const [targetLanguage, setTargetLanguage] = useState<string>('日本語');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const getPromptForMode = (mode: string): string => {
    switch (mode) {
      case 'formula':
        return '画像内の数式を識別して、LaTeXコードに変換してください。数式が複数ある場合は、すべてを変換してください。';
      case 'answer':
        return '画像内に書かれている問題を解いて、詳細な回答を提供してください。';
      case 'explain':
        return '画像内に書かれているテキストの内容を詳しく解説してください。';
      case 'translate':
        return `画像内のテキストを${targetLanguage}に翻訳してください。`;
      case 'question':
        return customQuestion || '画像について説明してください。';
      default:
        return '画像の内容を説明してください。';
    }
  };

  const handleAnalyze = async () => {
    if (!img) {
      alert('画像が読み込まれていません。');
      return;
    }

    if (selectedMode === 'question' && !customQuestion.trim()) {
      alert('質問を入力してください。');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const selectedModelObj = models.find(m => m.id === selectedModel);
      if (!selectedModelObj) {
        throw new Error('選択されたモデルが見つかりません。');
      }

      const prompt = getPromptForMode(selectedMode);
      let response: string;

      switch (selectedModelObj.provider) {
        case 'OpenAI':
          if (!apiKeys.openai) {
            throw new Error('OpenAI APIキーが設定されていません。');
          }
          response = await callOpenAI(apiKeys.openai, selectedModel, prompt, img);
          break;
        case 'Anthropic':
          if (!apiKeys.anthropic) {
            throw new Error('Anthropic APIキーが設定されていません。');
          }
          response = await callAnthropic(apiKeys.anthropic, selectedModel, prompt, img);
          break;
        case 'Google':
          if (!apiKeys.google) {
            throw new Error('Google APIキーが設定されていません。');
          }
          response = await callGoogle(apiKeys.google, selectedModel, prompt, img);
          break;
        default:
          throw new Error('サポートされていないプロバイダーです。');
      }

      setResult(response);
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      setResult(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">画像解析AIアプリケーション</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 画像表示エリア */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Image className="mr-2" size={20} />
            解析対象画像
          </h2>
          {img ? (
            <img 
              src={`data:image/jpeg;base64,${img}`} 
              alt="解析対象" 
              className="w-full h-64 object-contain bg-white rounded border"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded border flex items-center justify-center">
              <p className="text-gray-500">画像が読み込まれていません</p>
            </div>
          )}
        </div>

        {/* 設定エリア */}
        <div className="space-y-4">
          {/* モデル選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">AIモデル選択</label>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          {/* モード選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">解析モード</label>
            <select 
              value={selectedMode} 
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {modes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {modes.find(m => m.id === selectedMode)?.description}
            </p>
          </div>

          {/* 翻訳モード用の言語選択 */}
          {selectedMode === 'translate' && (
            <div>
              <label className="block text-sm font-medium mb-2">翻訳先言語</label>
              <input
                type="text"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                placeholder="例: 英語, 中国語, フランス語"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 質問モード用のテキスト入力 */}
          {selectedMode === 'question' && (
            <div>
              <label className="block text-sm font-medium mb-2">質問内容</label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="画像について質問したいことを入力してください..."
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              />
            </div>
          )}

          {/* 解析ボタン */}
          <button
            onClick={handleAnalyze}
            disabled={loading || !img}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                解析中...
              </>
            ) : (
              <>
                <Send className="mr-2" size={16} />
                解析実行
              </>
            )}
          </button>
        </div>
      </div>

      {/* 結果表示エリア */}
      {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">解析結果</h2>
          <div className="bg-white p-4 rounded border">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysisApp;