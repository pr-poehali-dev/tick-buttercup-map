-- Создание таблиц для системы мониторинга клещей и борщевика

-- Таблица меток пользователей
CREATE TABLE IF NOT EXISTS marks (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('tick', 'hogweed')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    verified BOOLEAN DEFAULT false,
    user_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by VARCHAR(50),
    description TEXT,
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN 54.0 AND 57.0 AND 
        longitude BETWEEN 35.0 AND 40.0
    )
);

-- Таблица запланированных обработок
CREATE TABLE IF NOT EXISTS planned_treatments (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('tick', 'hogweed')),
    area_name VARCHAR(255) NOT NULL,
    planned_date DATE NOT NULL,
    coordinates JSONB NOT NULL,
    color VARCHAR(7) NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица текущих обработок
CREATE TABLE IF NOT EXISTS current_treatments (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('tick', 'hogweed')),
    area_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    coordinates JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица новостей
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(50) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT true
);

-- Таблица лимитов для защиты от спама
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    user_ip VARCHAR(45) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_count INTEGER DEFAULT 1,
    last_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_ip, action_type)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_marks_type ON marks(type);
CREATE INDEX idx_marks_verified ON marks(verified);
CREATE INDEX idx_marks_created_at ON marks(created_at);
CREATE INDEX idx_marks_coordinates ON marks(latitude, longitude);
CREATE INDEX idx_planned_treatments_date ON planned_treatments(planned_date);
CREATE INDEX idx_current_treatments_dates ON current_treatments(start_date, end_date);
CREATE INDEX idx_current_treatments_status ON current_treatments(status);
CREATE INDEX idx_news_created_at ON news(created_at);
CREATE INDEX idx_rate_limits_ip ON rate_limits(user_ip);

-- Добавляем тестовые данные
INSERT INTO marks (type, latitude, longitude, verified, user_ip, description) VALUES
('tick', 55.7558, 37.6173, true, '127.0.0.1', 'Укус клеща в Сокольниках'),
('hogweed', 55.7522, 37.6156, false, '127.0.0.2', 'Заросли борщевика у дороги'),
('tick', 55.7480, 37.6350, true, '127.0.0.3', 'Обнаружен клещ на прогулке');

INSERT INTO planned_treatments (type, area_name, planned_date, coordinates, color, created_by) VALUES
('tick', 'Сокольники', '2025-11-15', '{"lat": 55.7944, "lng": 37.6706}', '#78350f', 'SergSyn'),
('hogweed', 'Измайлово', '2025-11-18', '{"lat": 55.7964, "lng": 37.7947}', '#15803d', 'IvanGesh');

INSERT INTO current_treatments (type, area_name, start_date, end_date, coordinates, status, created_by) VALUES
('tick', 'Битцевский парк', '2025-11-05', '2025-11-10', '{"lat": 55.6225, "lng": 37.5581}', 'active', 'SergSyn'),
('hogweed', 'Кузьминки', '2025-11-04', '2025-11-08', '{"lat": 55.7053, "lng": 37.7692}', 'active', 'IvanGesh');

INSERT INTO news (title, content, author) VALUES
('Начало сезона обработки территорий', 'Стартовала программа мониторинга и обработки территорий от клещей и борщевика. Просим жителей активно отмечать места обнаружения.', 'SergSyn'),
('Новые зоны риска выявлены', 'По результатам анализа определены новые зоны повышенного риска. Планируются дополнительные обработки.', 'IvanGesh');