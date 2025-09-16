-- Create a sample admin user for demonstration
-- First, insert sample categories for auctions
INSERT INTO public.categories (name, description) VALUES 
('Antiques', 'Historical artifacts and vintage items'),
('Art & Collectibles', 'Paintings, sculptures, and collectible items'),
('Jewelry', 'Traditional and modern jewelry pieces'),
('Vehicles', 'Cars, motorcycles, and vintage vehicles'),
('Electronics', 'Vintage and rare electronic items'),
('Books & Manuscripts', 'Rare books and historical manuscripts');

-- Note: Admin users will need to be added manually after user registration
-- The admin panel will be accessible once a user registers and is manually added to admin_users table