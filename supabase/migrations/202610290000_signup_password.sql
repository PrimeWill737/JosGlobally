alter table app_auth.login_tokens add column if not exists password_hash text;
