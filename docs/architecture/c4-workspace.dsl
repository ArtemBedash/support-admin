workspace "TeleBot Support Platform" "C4 diagrams for admin UI, webhook ingestion, and AI search flows" {
  model {
    supportManager = person "Support Manager" "Просматривает диалоги, ищет похожие сообщения, использует AI-чат."
    telegramUser = person "Telegram User" "Пишет в Telegram-бот и получает ответ."

    telegram = softwareSystem "Telegram" "Внешний мессенджер и Bot API." {
      tags "External"
    }

    openai = softwareSystem "OpenAI API" "Внешний AI API (embeddings + chat completions)." {
      tags "External"
    }

    supabasePlatform = softwareSystem "Supabase Project" "Postgres + RPC + Edge Functions." {
      tags "External"

      messagesDb = container "messages table + vector index" "Хранит сообщения Telegram и эмбеддинги; использует RPC match_messages." "PostgreSQL + pgvector"
      webhookFn = container "telegram-webhook function" "Получает webhook от Telegram, создает embedding, пишет в БД, отправляет автоответ." "Deno Edge Function" {
        webhookParser = component "Webhook parser" "Парсит update payload, валидирует message/text и ветвит сценарий." "payload parsing + routing"
        startHandler = component "Start command handler" "Обрабатывает /start и отправляет приветственное сообщение." "command handler"
        embeddingClient = component "Embedding client" "Запрашивает embedding через OpenAI API и проверяет размерность." "createTextEmbedding"
        messageWriter = component "Message writer" "Сохраняет сообщение и embedding в таблицу messages." "Supabase JS client insert"
        telegramSender = component "Telegram sender" "Отправляет ответы пользователю через Telegram Bot API." "sendMessage client"
      }
    }

    supportSystem = softwareSystem "TeleBot Support Admin" "Админская система поддержки и семантического поиска." {
      adminWeb = container "support-admin web app" "UI консоль поддержки, список диалогов, semantic search и AI assistant." "Next.js 16 + TypeScript"

      messagesPage = component "Messages page" "SSR загрузка последних сообщений из Supabase." "src/app/page.tsx"
      adminConsole = component "Admin console UI" "Клиентский интерфейс фильтров, диалогов, переключения тем и поиска." "src/app/_components/admin-console.tsx"
      searchApi = component "Search API route" "POST /api/search: embedding запроса + vector RPC match_messages." "src/app/api/search/route.ts"
      chatApi = component "Chat API route" "POST /api/chat: RAG-контекст + ответ LLM." "src/app/api/chat/route.ts"
      openaiLib = component "OpenAI libs" "createEmbedding + createChatAnswer для API вызовов." "src/lib/openai.ts + src/lib/openai-chat.ts"
      vectorSearchLib = component "Vector search lib" "RPC-вызов match_messages через Supabase service role client." "src/lib/vector-search.ts"
    }

    supportManager -> adminWeb "Работает в браузере" "HTTPS"
    telegramUser -> telegram "Отправляет сообщения"
    telegram -> webhookFn "Webhook updates" "HTTPS"

    webhookFn -> openai "Создает embeddings" "HTTPS/JSON"
    webhookFn -> messagesDb "Сохраняет message + embedding" "SQL via Supabase client"
    webhookFn -> telegram "Отправляет автоответ" "Bot API"
    telegram -> webhookParser "Webhook update payload" "HTTPS"
    webhookParser -> startHandler "Если команда /start"
    webhookParser -> embeddingClient "Если обычное текстовое сообщение"
    embeddingClient -> openai "POST /v1/embeddings" "HTTPS/JSON"
    webhookParser -> messageWriter "Сохранение входящего сообщения"
    messageWriter -> messagesDb "INSERT messages" "SQL"
    startHandler -> telegramSender "Приветственное сообщение"
    webhookParser -> telegramSender "Echo/операционный ответ"
    telegramSender -> telegram "POST sendMessage" "Bot API"

    adminWeb -> messagesDb "Читает последние сообщения (SSR)" "Supabase JS"
    searchApi -> openai "Создает embedding для user query" "HTTPS/JSON"
    searchApi -> vectorSearchLib "Выполняет vector search"
    vectorSearchLib -> messagesDb "RPC match_messages" "SQL/RPC"
    chatApi -> openaiLib "Создает embeddings + chat answer"
    chatApi -> vectorSearchLib "Собирает релевантный контекст"
    openaiLib -> openai "Embeddings + Chat Completions" "HTTPS/JSON"
    adminConsole -> searchApi "Semantic search запросы" "HTTP POST /api/search"
    adminConsole -> chatApi "AI assistant запросы" "HTTP POST /api/chat"
    messagesPage -> adminConsole "Передает initial messages + errors" "props"
  }

  views {
    systemContext supportSystem "c4-l1-system-context" {
      include *
      autolayout lr
      title "C4 L1 - System Context"
    }

    container supportSystem "c4-l2-container" {
      include *
      autolayout lr
      title "C4 L2 - Container Diagram"
    }

    component adminWeb "c4-l3-component-admin-web" {
      include *
      autolayout lr
      title "C4 L3 - Components (support-admin web app)"
    }

    component webhookFn "c4-l3-component-webhook" {
      include *
      autolayout lr
      title "C4 L3 - Components (telegram-webhook backend)"
    }

    styles {
      element "Person" {
        shape Person
        background "#0b5fff"
        color "#ffffff"
      }

      element "Software System" {
        background "#224066"
        color "#ffffff"
      }

      element "Container" {
        background "#2b6cb0"
        color "#ffffff"
      }

      element "Component" {
        background "#4c8fd6"
        color "#ffffff"
      }

      element "External" {
        background "#48556a"
        color "#ffffff"
        border Dashed
      }
    }
  }
}
