import { formatTime } from '../utils/formatTime'

export default function Message({ message, user, onDelete }) {
  const isOwn = message.user_id === user.id
  const isRead = message.is_read === 1
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Аватарка */}
        {!isOwn && (
          <div className="flex-shrink-0 w-10">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-hidden shadow-md">
              {message.avatar ? (
                <img src={message.avatar} alt={message.username} className="w-10 h-10 object-cover" />
              ) : (
                message.username?.[0]?.toUpperCase()
              )}
            </div>
          </div>
        )}

        {/* Сообщение */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Ник */}
          {!isOwn && (
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-1 mb-1 font-medium">
              {message.username}
            </p>
          )}
          
          {/* Пузырь сообщения */}
          <div className={`relative px-4 py-2 rounded-2xl shadow-md ${
            isOwn 
              ? 'bg-primary text-white rounded-br-sm' 
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
          }`}>
            {/* Кнопка удаления */}
            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Удалить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Текст */}
            {message.content && (
              <p className="break-words whitespace-normal">{message.content}</p>
            )}
            
            {/* Файл */}
            {message.file_url && (
              <div className="mt-2">
                {message.file_type?.startsWith('image/') ? (
                  <img src={message.file_url} alt={message.file_name} className="max-w-full rounded-lg" />
                ) : (
                  <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">{message.file_name}</span>
                  </a>
                )}
              </div>
            )}
            
            {/* Время + галочки */}
            <div className="flex items-center gap-1 justify-end mt-1">
              <span className="text-xs opacity-60">{formatTime(message.created_at)}</span>
              
              {/* Галочки прочтения (только для своих сообщений) */}
              {isOwn && (
                <div className="flex items-center gap-0.5">
                  {isRead ? (
                    // ✓✓ Прочитано (синие)
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    // ✓ Отправлено (серые)
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}