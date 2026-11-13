import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Send } from 'lucide-react';
import { useState } from 'react';
import type { RequestItem, UserProfile } from '../types';

interface AdminDashboardProps {
  requests: RequestItem[];
  students: UserProfile[];
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string, comment: string) => void;
  onSendNotification: (studentId: string, message: string) => void;
}

const RISK_STUDENTS = [
  {
    name: 'Соколов Дмитрий Игоревич',
    studentId: '24-18205',
    brsAverage: 51,
    risk: 'Микроэкономика: 38/100 ⚠️',
    status: 'red',
  },
];

export const AdminDashboard = ({
  requests,
  onApproveRequest,
  onRejectRequest,
  onSendNotification,
}: AdminDashboardProps) => {
  const [rejectComment, setRejectComment] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.stage < 5);
  const atRiskRequests = requests.filter((r) => r.stage === 3); // На подписи
  const completedRequests = requests.filter((r) => r.stage === 5);

  return (
    <div className="space-y-6 pb-24">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 shadow-lg"
        >
          <p className="text-xs text-blue-100">Всего заявок</p>
          <p className="text-2xl font-bold mt-1">{requests.length}</p>
          <p className="text-[10px] text-blue-200 mt-2">📊 Объём документооборота</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 shadow-lg"
        >
          <p className="text-xs text-amber-100">В обработке</p>
          <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
          <p className="text-[10px] text-amber-200 mt-2">⏳ Требуют действия</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 shadow-lg"
        >
          <p className="text-xs text-purple-100">На подписи</p>
          <p className="text-2xl font-bold mt-1">{atRiskRequests.length}</p>
          <p className="text-[10px] text-purple-200 mt-2">🖊️ Готовы к ЭЦП</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 shadow-lg"
        >
          <p className="text-xs text-emerald-100">Готовы</p>
          <p className="text-2xl font-bold mt-1">{completedRequests.length}</p>
          <p className="text-[10px] text-emerald-200 mt-2">✅ Выданы студентам</p>
        </motion.div>
      </div>

      {/* Requests Approval Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-semibold text-lg text-slate-900 mb-4">⚡ Срочная подпись ЭЦП</h2>

        {atRiskRequests.length === 0 ? (
          <p className="text-sm text-slate-500">Нет заявок, требующих подписи</p>
        ) : (
          <div className="space-y-3">
            {atRiskRequests.slice(0, 3).map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start justify-between gap-3 p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-sm">{req.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {req.category} • {req.deliveryFormat}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onApproveRequest(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-all"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Подписать
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRequest(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Отклонить
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 space-y-2"
          >
            <p className="text-xs font-medium text-red-900">Причина отклонения:</p>
            <input
              type="text"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Введите комментарий..."
              className="w-full text-xs px-2 py-1.5 rounded border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={() => {
                onRejectRequest(selectedRequest, rejectComment);
                setSelectedRequest(null);
                setRejectComment('');
              }}
              className="w-full text-xs font-medium bg-red-600 text-white py-1.5 rounded hover:bg-red-700 transition-all"
            >
              Отклонить заявку
            </button>
          </motion.div>
        )}
      </div>

      {/* Risk Students */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Студенты группы риска (AI Early Warning)
        </h2>

        <div className="space-y-3">
          {RISK_STUDENTS.map((student) => (
            <motion.div
              key={student.studentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border-2 border-red-200 bg-red-50"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {student.studentId} • БРС: {student.brsAverage}/100
                  </p>
                  <p className="text-xs text-red-700 font-medium mt-2">⚠️ {student.risk}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedStudent(student.studentId)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all flex-shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Пуш
                </motion.button>
              </div>

              {/* Push Notification Input */}
              {selectedStudent === student.studentId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 bg-white rounded-lg border border-red-300 space-y-2"
                >
                  <p className="text-xs font-medium text-slate-700">Персональное пуш-уведомление:</p>
                  <textarea
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    placeholder="Например: 'Срочно посетите консультацию по микроэкономике в среду 15:00'"
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-16"
                  />
                  <button
                    onClick={() => {
                      onSendNotification(student.studentId, pushMessage);
                      setPushMessage('');
                      setSelectedStudent(null);
                    }}
                    className="w-full text-xs font-medium bg-red-600 text-white py-1.5 rounded hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Отправить пуш в ЛК студента
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-blue-50 border border-blue-200"
      >
        <p className="text-xs text-blue-900">
          💡 <strong>Демо-режим:</strong> При подписании заявки здесь она автоматически переходит в
          статус «Готово» в кабинете студента!
        </p>
      </motion.div>
    </div>
  );
};
