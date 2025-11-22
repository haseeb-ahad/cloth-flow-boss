-- Change stock_quantity column from integer to numeric to support decimal values
ALTER TABLE products 
ALTER COLUMN stock_quantity TYPE numeric USING stock_quantity::numeric;