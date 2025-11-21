-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    notification_type ENUM('email', 'sms', 'discord', 'telegram', 'all') NOT NULL,
    channel_id VARCHAR(255),
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start_time VARCHAR(5), -- HH:MM format
    quiet_hours_end_time VARCHAR(5), -- HH:MM format
    timezone VARCHAR(100) DEFAULT 'UTC',
    days_of_week JSON, -- Array of 0-6 (Sunday = 0)
    exceptions JSON, -- Array of holiday names or dates
    priority_overrides_critical BOOLEAN DEFAULT TRUE,
    priority_overrides_high BOOLEAN DEFAULT FALSE,
    priority_overrides_normal BOOLEAN DEFAULT FALSE,
    priority_overrides_low BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_preferences_user_id (user_id),
    INDEX idx_user_preferences_notification_type (notification_type),
    INDEX idx_user_preferences_active (is_active)
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    notification_type ENUM('email', 'sms', 'discord', 'telegram') NOT NULL,
    channel_id VARCHAR(255),
    event_type VARCHAR(255) NOT NULL,
    event_data JSON NOT NULL,
    priority ENUM('low', 'normal', 'high', 'critical') NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_error TEXT,
    status ENUM('pending', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_queue_user_id (user_id),
    INDEX idx_notification_queue_scheduled_for (scheduled_for),
    INDEX idx_notification_queue_status (status),
    INDEX idx_notification_queue_priority (priority)
);

-- Holidays Configuration Table
CREATE TABLE IF NOT EXISTS holiday_config (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type ENUM('national', 'religious', 'custom') NOT NULL,
    country VARCHAR(100),
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_holiday_date (date, country, region)
);

-- Timezone Configuration Table
CREATE TABLE IF NOT EXISTS timezone_config (
    id VARCHAR(255) PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    offset_hours INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default timezones
INSERT IGNORE INTO timezone_config (id, identifier, display_name, offset_hours) VALUES
('utc', 'UTC', 'Coordinated Universal Time', 0),
('est', 'America/New_York', 'Eastern Standard Time', -5),
('cst', 'America/Chicago', 'Central Standard Time', -6),
('mst', 'America/Denver', 'Mountain Standard Time', -7),
('pst', 'America/Los_Angeles', 'Pacific Standard Time', -8),
('cet', 'Europe/Berlin', 'Central European Time', 1),
('jst', 'Asia/Tokyo', 'Japan Standard Time', 9),
('aest', 'Australia/Sydney', 'Australian Eastern Standard Time', 10);

-- Insert common holidays (2024-2025)
INSERT IGNORE INTO holiday_config (id, name, date, type, country) VALUES
-- US Holidays 2024
('us-new-year-2024', 'New Year\'s Day', '2024-01-01', 'national', 'US'),
('us-mlk-2024', 'Martin Luther King Jr. Day', '2024-01-15', 'national', 'US'),
('us-presidents-2024', 'Presidents\' Day', '2024-02-19', 'national', 'US'),
('us-memorial-2024', 'Memorial Day', '2024-05-27', 'national', 'US'),
('us-juneteenth-2024', 'Juneteenth', '2024-06-19', 'national', 'US'),
('us-independence-2024', 'Independence Day', '2024-07-04', 'national', 'US'),
('us-labor-2024', 'Labor Day', '2024-09-02', 'national', 'US'),
('us-columbus-2024', 'Columbus Day', '2024-10-14', 'national', 'US'),
('us-veterans-2024', 'Veterans Day', '2024-11-11', 'national', 'US'),
('us-thanksgiving-2024', 'Thanksgiving', '2024-11-28', 'national', 'US'),
('us-christmas-2024', 'Christmas Day', '2024-12-25', 'national', 'US'),

-- US Holidays 2025
('us-new-year-2025', 'New Year\'s Day', '2025-01-01', 'national', 'US'),
('us-mlk-2025', 'Martin Luther King Jr. Day', '2025-01-20', 'national', 'US'),
('us-presidents-2025', 'Presidents\' Day', '2025-02-17', 'national', 'US'),
('us-memorial-2025', 'Memorial Day', '2025-05-26', 'national', 'US'),
('us-juneteenth-2025', 'Juneteenth', '2025-06-19', 'national', 'US'),
('us-independence-2025', 'Independence Day', '2025-07-04', 'national', 'US'),
('us-labor-2025', 'Labor Day', '2025-09-01', 'national', 'US'),
('us-columbus-2025', 'Columbus Day', '2025-10-13', 'national', 'US'),
('us-veterans-2025', 'Veterans Day', '2025-11-11', 'national', 'US'),
('us-thanksgiving-2025', 'Thanksgiving', '2025-11-27', 'national', 'US'),
('us-christmas-2025', 'Christmas Day', '2025-12-25', 'national', 'US'),

-- Global Holidays
('christmas-eve', 'Christmas Eve', '2024-12-24', 'religious', NULL),
('christmas-eve-2025', 'Christmas Eve', '2025-12-24', 'religious', NULL),
('new-years-eve', 'New Year\'s Eve', '2024-12-31', 'custom', NULL),
('new-years-eve-2025', 'New Year\'s Eve', '2025-12-31', 'custom', NULL);
