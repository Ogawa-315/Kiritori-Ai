import React, { useEffect, useState } from 'react';
import { Settings, Sparkles, Calculator, HelpCircle, FileText, Edit3, Languages, Send, Loader2, Image, Check, Copy } from 'lucide-react';
import { callAnthropic, callGoogle, callOpenAI } from '../lib/models';
import TitleBar from '../components/TitleBar';
import ReactMarkdown from 'react-markdown';


interface Model {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google';
}

interface ApiKeys {
  openai: string;
  anthropic: string;
  google: string;
}

const models: Model[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
];

const KiritoriAI: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    anthropic: '',
    google: '',
  });

  const [targetLanguage, setTargetLanguage] = useState<string>('日本語');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [base64FromMain, setBase64FromMain] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後にリセット
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const handleClick = () => {
  window.electronAPI.openExternal();
  console.log("外部ページ")
};
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('formula');

  const tabs = [
    { id: 'formula', label: '数式', icon: Calculator },
    { id: 'answer', label: '問題解説', icon: HelpCircle },
    { id: 'explain', label: '解説', icon: FileText },
    { id: 'question', label: '自由', icon: Edit3 },
    { id: 'translate', label: '翻訳', icon: Languages },
  ];

  useEffect(() => {
    // イベントリスナーをセット
    window.electronAPI.onScreenshotBase64((base64: string) => {
        console.log("get base");
      setBase64FromMain(base64);
    });
    const sendReady = () =>{window.electronAPI.ipcRendererReady();console.log("send Ready")};
    sendReady();
    const loadApiKeysFromLocalStorage = (): ApiKeys => {
        const stored = localStorage.getItem('apiKeys');
        if (stored) {
            try {
            const parsed = JSON.parse(stored);
            // 型安全のため各キーを明示的にチェック
            setApiKeys(parsed);
            } catch {
            // パース失敗時は空で返す
            setApiKeys({ openai: '', anthropic: '', google: '' })
            }
        }
        return { openai: '', anthropic: '', google: '' };
    };

    const getSelectedModelFromLocalStorage = () => {
        const stored = localStorage.getItem('selectedModel');
        if (stored) {
            try{
               setSelectedModel(stored) ;  
            } catch {
                console.log("not stored selected model in localStorage")
            }
        }
    }
    getSelectedModelFromLocalStorage();
    loadApiKeysFromLocalStorage();
  }, []);

  const selectedModelData = models.find(m => m.id === selectedModel);

  // APIキーが設定されているプロバイダーのモデルのみを取得
  const availableModels = models.filter(model => {
    switch (model.provider) {
      case 'OpenAI':
        return apiKeys.openai.trim() !== '';
      case 'Anthropic':
        return apiKeys.anthropic.trim() !== '';
      case 'Google':
        return apiKeys.google.trim() !== '';
      default:
        return false;
    }
  });

  // 選択されたモデルが利用可能でない場合、利用可能な最初のモデルを選択
  React.useEffect(() => {
    if (selectedModel && !availableModels.find(m => m.id === selectedModel)) {
      setSelectedModel(availableModels.length > 0 ? availableModels[0].id : '');
      
    }
  }, [apiKeys, selectedModel, availableModels]);

  const updateApiKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => {
    const newApiKeys = { ...prev, [provider]: value };
    localStorage.setItem('apiKeys', JSON.stringify(newApiKeys));
    return newApiKeys;
  });
  };

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
      if (!base64FromMain) {
        alert('画像が読み込まれていません。');
        return;
      }
  
      if (activeTab === 'question' && !customQuestion.trim()) {
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
  
        const prompt = getPromptForMode(activeTab);
        let response: string;
  
        switch (selectedModelObj.provider) {
          case 'OpenAI':
            if (!apiKeys.openai) {
              throw new Error('エラーが発生しました。OpenAI APIキーが正しいか確認してください。');
            }
            response = await callOpenAI(apiKeys.openai, selectedModel, prompt, base64FromMain);
            break;
          case 'Anthropic':
            if (!apiKeys.anthropic) {
              throw new Error('エラーが発生しました。Anthropic APIキーが正しいか確認してください。');
            }
            response = await callAnthropic(apiKeys.anthropic, selectedModel, prompt, base64FromMain);
            break;
          case 'Google':
            if (!apiKeys.google) {
              throw new Error('エラーが発生しました。Google APIキーが正しいか確認してください。');
            }
            response = await callGoogle(apiKeys.google, selectedModel, prompt, base64FromMain);
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
    <div className="overflow-x-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 font-sans flex flex-col items-center p-8">
        <TitleBar />
        <div className='w-full h-[30px]'></div>
        <div className='overflow-y-auto w-full flex flex-col items-center'>
      {/* Header */}
      <div className="overflow-x-hidden overflow-y-hidden w-full max-w-4xl flex justify-between items-center mb-8 text-white">
        <button className="text-sm opacity-80 cursor-pointer" 
         onClick={handleClick}>
          使い方
        </button>
        <div className="flex items-center gap-2 text-sm opacity-80">
          <span>モデル: {selectedModelData?.name || '未選択'}</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/20 hover:bg-white/30 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-white transition-all duration-300 hover:rotate-90"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <h3 className="flex items-center gap-2 text-gray-800 text-lg font-semibold mb-6">
            <Sparkles size={20} className="text-indigo-500" />
            設定
          </h3>
          
          <div className="mb-6">
            <label className="block text-gray-600 font-medium mb-2">
              AIモデル選択
            </label>
            {availableModels.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => {setSelectedModel(e.target.value);localStorage.setItem('selectedModel', e.target.value);}}
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base bg-white transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {['OpenAI', 'Anthropic', 'Google'].map(provider => {
                  const providerModels = availableModels.filter(m => m.provider === provider);
                  if (providerModels.length === 0) return null;
                  
                  return (
                    <optgroup key={provider} label={provider}>
                      {providerModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            ) : (
              <div className="p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-center text-sm">
                モデルを使用するには、まずAPIキーを設定してください
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div>
              <label className="flex items-center gap-2 text-gray-600 font-medium mb-2">
                OpenAI APIキー
                {apiKeys.openai && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    設定済み
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKeys.openai}
                onChange={(e) => updateApiKey('openai', e.target.value)}
                placeholder="sk-..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-600 font-medium mb-2">
                Anthropic APIキー (Claude)
                {apiKeys.anthropic && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    設定済み
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKeys.anthropic}
                onChange={(e) => updateApiKey('anthropic', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-600 font-medium mb-2">
                Google APIキー (Gemini)
                {apiKeys.google && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    設定済み
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKeys.google}
                onChange={(e) => updateApiKey('google', e.target.value)}
                placeholder="AIza..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-12 w-full max-w-4xl text-center shadow-2xl border border-white/20">
        {/* Title */}
        <h1 className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent text-5xl font-bold mb-2 tracking-tight">
          Kiritori-Ai
        </h1>
        
        <div className="text-gray-600 text-xl mb-5 font-normal">
          キリトリ-Ai
        </div>

        <div className="text-gray-500 text-sm mb-5 flex items-center justify-center gap-2">
          <kbd className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-300">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-300">
            Shift
          </kbd>
          <span>+</span>
          <kbd className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-300">
            A
          </kbd>
        </div>
        {/* 画像表示エリア */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Image className="mr-2" size={20} />
            送信画像
          </h2>
          {base64FromMain ? (
            <img 
              src={`data:image/jpeg;base64,${base64FromMain}`} 
              alt="解析対象" 
              className="w-full h-64 object-contain bg-white rounded border"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded border flex items-center justify-center">
              <p className="text-gray-500">画像が読み込まれていません</p>
            </div>
          )}
        </div>
        

        {/* Tab Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 -translate-y-0.5' 
                    : 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-100 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10'
                  }
                  rounded-xl px-6 py-4 text-base font-semibold cursor-pointer transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                  flex items-center gap-2 min-w-[120px] justify-center
                `}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* 翻訳モード用の言語選択 */}
          {activeTab === 'translate' && (
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
          {activeTab === 'question' && (
            <div className='mt-5'>
              <label className="block text-sm font-medium mb-2">質問内容</label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="画像について質問したいことを入力してください..."
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-20 resize-none"
              />
            </div>
          )}
        <div className="flex items-center justify-center">
          <button
            onClick={handleAnalyze}
            disabled={loading || !base64FromMain}
            className="min-w-120 mt-5 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                読み込み中...
              </>
            ) : (
              <>
                <Send className="mr-2" size={16} />
                送信
              </>
            )}
          </button>
        </div>
        
        {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">返信結果</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
        >
          {copied ? (
            <>
              <Check size={16} />
              コピー済み
            </>
          ) : (
            <>
              <Copy size={16} />
              コピー
            </>
          )}
        </button>
      </div>
      <div className="bg-white p-4 rounded border relative">
        <ReactMarkdown>{result}</ReactMarkdown>
      </div>
    </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default KiritoriAI;
