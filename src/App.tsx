/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Leaf, 
  AlertCircle, 
  CheckCircle2, 
  ShoppingBag, 
  ExternalLink, 
  RefreshCw,
  Search,
  ArrowRight,
  X,
  Target,
  Info
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzePlantImage, type AnalysisResult, type Issue } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Файл слишком большой. Максимальный размер — 10МБ.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
        setSelectedIssueIndex(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const mimeType = image.split(';')[0].split(':')[1];
      const analysis = await analyzePlantImage(image, mimeType);
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      if (err.message === "MISSING_API_KEY") {
        setError('API-ключ не найден. Пожалуйста, добавьте GEMINI_API_KEY в переменные окружения Vercel и сделайте REDEPLOY проекта.');
      } else {
        setError('Не удалось проанализировать изображение. Пожалуйста, попробуйте еще раз.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setSelectedIssueIndex(null);
  };

  const renderBoundingBox = (box: [number, number, number, number], index: number) => {
    const [ymin, xmin, ymax, xmax] = box;
    const isSelected = selectedIssueIndex === index;
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: selectedIssueIndex === null || isSelected ? 1 : 0.3,
          scale: isSelected ? 1.05 : 1,
          borderWidth: isSelected ? '4px' : '2px'
        }}
        onClick={() => setSelectedIssueIndex(isSelected ? null : index)}
        className={cn(
          "absolute cursor-pointer transition-all rounded-lg z-20",
          isSelected ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "border-white/80 bg-white/5"
        )}
        style={{
          top: `${ymin / 10}%`,
          left: `${xmin / 10}%`,
          height: `${(ymax - ymin) / 10}%`,
          width: `${(xmax - xmin) / 10}%`,
        }}
      >
        <div className={cn(
          "absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
          isSelected ? "bg-red-500 text-white" : "bg-white/80 text-earth-900"
        )}>
          {result?.issues[index].title}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-sage-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sage-600 rounded-lg flex items-center justify-center text-white">
              <Leaf size={20} />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">PlantDoc AI</h1>
          </div>
          {image && (
            <button 
              onClick={reset}
              className="text-sage-600 hover:text-sage-800 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} />
              Сбросить
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">
                  Лечите ваши растения с <span className="text-sage-600 italic">точностью ИИ</span>
                </h2>
                <p className="text-lg text-sage-600 mb-10">
                  Загрузите фото листьев или стеблей вашего растения. Наш ИИ поставит диагноз и укажет на проблемные зоны прямо на фото.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-sage-200 rounded-3xl bg-white hover:border-sage-600 hover:bg-sage-50 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <span className="font-medium">Загрузить фото</span>
                    <span className="text-xs text-sage-400 mt-1">PNG, JPG до 10МБ</span>
                  </button>

                  <button 
                    onClick={() => {
                      fileInputRef.current?.setAttribute('capture', 'environment');
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center justify-center p-8 border-2 border-sage-200 rounded-3xl bg-sage-600 text-white hover:bg-sage-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Camera size={24} />
                    </div>
                    <span className="font-medium">Сделать снимок</span>
                    <span className="text-xs text-white/60 mt-1">Используйте камеру</span>
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Image Preview & Action */}
              <div className="space-y-6">
                <div 
                  ref={imageContainerRef}
                  className="relative aspect-square rounded-3xl overflow-hidden bg-sage-100 border border-sage-200 shadow-xl"
                >
                  <img 
                    src={image} 
                    alt="Plant to analyze" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Bounding Boxes */}
                  {result && result.issues.map((issue, idx) => renderBoundingBox(issue.boundingBox, idx))}

                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="mb-4"
                      >
                        <RefreshCw size={40} />
                      </motion.div>
                      <p className="font-medium text-lg">Анализируем здоровье растения...</p>
                      <p className="text-sm text-white/70">Ищем советы экспертов...</p>
                    </div>
                  )}
                </div>

                {!result && !isAnalyzing && (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full py-4 bg-sage-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-sage-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={20} />
                    Начать анализ
                  </button>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {result && result.issues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-sage-500 flex items-center gap-2">
                      <Target size={16} />
                      Выявленные проблемы
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {result.issues.map((issue, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIssueIndex(selectedIssueIndex === idx ? null : idx)}
                          className={cn(
                            "text-left p-4 rounded-2xl border transition-all flex items-start gap-3 group",
                            selectedIssueIndex === idx 
                              ? "bg-red-50 border-red-200 ring-1 ring-red-200" 
                              : "bg-white border-sage-200 hover:border-sage-400"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                            selectedIssueIndex === idx ? "bg-red-500 text-white" : "bg-sage-100 text-sage-600"
                          )}>
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className={cn(
                              "font-bold text-sm",
                              selectedIssueIndex === idx ? "text-red-700" : "text-earth-900"
                            )}>{issue.title}</h4>
                            <p className="text-xs text-sage-500 mt-1 leading-relaxed">{issue.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="space-y-6">
                {!result && !isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-sage-200 rounded-3xl bg-white/50">
                    <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center text-sage-400 mb-4">
                      <Search size={32} />
                    </div>
                    <h3 className="text-xl font-serif font-bold mb-2">Готов к анализу</h3>
                    <p className="text-sage-500">Нажмите кнопку, чтобы запустить ИИ-диагностику вашего растения.</p>
                  </div>
                )}

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Plant Name Section */}
                    <div className="bg-sage-600 text-white p-6 rounded-3xl shadow-lg">
                      <div className="flex items-center gap-2 mb-1 opacity-80">
                        <Leaf size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Растение определено как:</span>
                      </div>
                      <h2 className="font-serif text-3xl font-bold">{result.plantName}</h2>
                    </div>

                    {/* Diagnosis Section */}
                    <section className="bg-white p-6 rounded-3xl border border-sage-200 shadow-sm relative overflow-hidden">
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        result.issues.length === 0 ? "bg-green-500" : "bg-sage-600"
                      )} />
                      <div className={cn(
                        "flex items-center gap-3 mb-4",
                        result.issues.length === 0 ? "text-green-600" : "text-sage-600"
                      )}>
                        {result.issues.length === 0 ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <h3 className="font-serif text-xl font-bold">Общий диагноз</h3>
                      </div>
                      <p className="text-lg text-earth-900 font-medium leading-relaxed">
                        {result.diagnosis}
                      </p>
                      {result.issues.length === 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded-xl text-green-700 text-sm flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          Ваше растение выглядит здоровым!
                        </div>
                      )}
                    </section>

                    {/* Recommendations Section */}
                    <section className="bg-white p-6 rounded-3xl border border-sage-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4 text-sage-600">
                        <CheckCircle2 size={20} />
                        <h3 className="font-serif text-xl font-bold">Рекомендации по уходу</h3>
                      </div>
                      <div className="prose prose-sage max-w-none text-sage-800 prose-sm">
                        <Markdown>{result.recommendations}</Markdown>
                      </div>
                    </section>

                    {/* Products Section */}
                    <section className="bg-white p-6 rounded-3xl border border-sage-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4 text-sage-600">
                        <ShoppingBag size={20} />
                        <h3 className="font-serif text-xl font-bold">Что купить</h3>
                      </div>
                      <div className="prose prose-sage max-w-none text-sage-800 prose-sm">
                        <Markdown>{result.products}</Markdown>
                      </div>
                    </section>

                    {/* Sources Section */}
                    {result.sources.length > 0 && (
                      <section className="bg-sage-100/50 p-6 rounded-3xl border border-sage-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-sage-500 mb-4">Источники и литература</h4>
                        <div className="space-y-2">
                          {result.sources.map((source, idx) => (
                            <a 
                              key={idx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-sage-200 hover:border-sage-600 transition-colors group"
                            >
                              <span className="text-sm font-medium truncate pr-4">{source.title}</span>
                              <ExternalLink size={14} className="text-sage-400 group-hover:text-sage-600 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-sage-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-sage-400">
            Работает на базе Gemini AI с поиском Google. 
            Всегда консультируйтесь со специалистами при серьезных проблемах.
          </p>
        </div>
      </footer>
    </div>
  );
}
