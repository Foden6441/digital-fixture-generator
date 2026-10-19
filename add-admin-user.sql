-- Insert admin user if it doesn't exist
INSERT INTO "users" ("id", "email", "name", "password", "role")
VALUES (
    'admin-user-id',
    'admin@example.com',
    'Admin',
    '$2a$10$rE3W8xQO8hF5ZyNfJ5j1uOEK5W7yN8hQYxPZlN8gR9hF5ZyNfJ5j1u',
    'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

SELECT 'Admin user created!' as status;
