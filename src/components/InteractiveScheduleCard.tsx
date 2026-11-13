import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, BookOpen, CheckCircle2, Sliders } from 'lucide-react';
import type { ScheduleItem } from '../types';
import { BottomSheet } from './BottomSheet';

interface InteractiveScheduleCardProps {
  item: ScheduleItem;
  index: number;
}

export const InteractiveScheduleCard = ({ item, index }: InteractiveScheduleCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(70);
  const [checkedHomework, setCheckedHomework] = useState<boolean[]>([false, false, false]);

  const autoPassThreshold = 90;

  const homeworkItems = [
    'Подготовить реферат на 10-15 страниц',
    'Прочитать 3-4 главы из учебника',
    'Решить задачи из сборника (1-20)',
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              {item.type}
            </p>
            <h3 className="mt-1 font-semibold text-slate-900">{item.subject}</h3>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {item.time}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{item.room}, {item.building}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{item.professor}</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Sheet с деталями */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={item.subject}>
        <div className="space-y-6">
          {/* Основная информация */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-600">Время</p>
                <p className="font-semibold text-slate-900">{item.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-600">Место</p>
                <p className="font-semibold text-slate-900">
                  {item.building}, аудитория {item.room}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-3">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-600">Преподаватель</p>
                <p className="font-semibold text-slate-900">{item.professor}</p>
              </div>
            </div>
          </div>

          {/* Домашнее задание */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Домашнее задание
            </h4>
            <div className="space-y-2">
              {homeworkItems.map((hw, idx) => (
                <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                  <motion.div
                    animate={{ scale: checkedHomework[idx] ? 1.1 : 1 }}
                    className="mt-1"
                  >
                    <input
                      type="checkbox"
                      checked={checkedHomework[idx]}
                      onChange={() => {
                        const newChecked = [...checkedHomework];
                        newChecked[idx] = !newChecked[idx];
                        setCheckedHomework(newChecked);
                      }}
                      className="h-5 w-5 rounded-lg border-2 border-slate-300 accent-emerald-500"
                    />
                  </motion.div>
                  <span
                    className={`text-sm transition-all ${
                      checkedHomework[idx]
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {hw}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Калькулятор баллов */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
              <Sliders className="h-5 w-5 text-purple-600" />
              Калькулятор баллов
            </h4>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Текущий рейтинг: {sliderValue} баллов
                  </label>
                  <div className="flex gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        sliderValue >= autoPassThreshold
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Автомат: {Math.max(0, autoPassThreshold - sliderValue)} баллов
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />

                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              <motion.div
                animate={{
                  backgroundColor:
                    sliderValue >= autoPassThreshold
                      ? 'rgb(16 185 129 / 0.1)'
                      : sliderValue >= 70
                        ? 'rgb(59 130 246 / 0.1)'
                        : 'rgb(239 68 68 / 0.1)',
                }}
                className="rounded-lg p-3 transition-colors"
              >
                <p className="text-xs text-slate-600 mb-1">Прогноз:</p>
                <p
                  className={`font-semibold ${
                    sliderValue >= autoPassThreshold
                      ? 'text-emerald-700'
                      : sliderValue >= 70
                        ? 'text-blue-700'
                        : 'text-red-700'
                  }`}
                >
                  {sliderValue >= autoPassThreshold
                    ? `✓ Автомат гарантирован!`
                    : sliderValue >= 70
                      ? `✓ Допуск к зачету`
                      : `✗ Нужно ${70 - sliderValue} баллов`}
                </p>
              </motion.div>
            </div>
          </div>

          {/* Отметиться на паре */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
            <CheckCircle2 className="h-4 w-4 inline mr-2" />
            Отметиться на паре (Гео-чек в кампусе)
          </motion.button>
        </div>
      </BottomSheet>
    </>
  );
};
