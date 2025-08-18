CREATE FUNCTION find_plasmids(lots INTEGER[], sublots TEXT[])
RETURNS TABLE (bag VARCHAR(10), lot INTEGER, sub_lot VARCHAR(10)) as $$
BEGIN
    RETURN QUERY
    SELECT u.bag, u.lot, u.sub_lot
    FROM plasmids p
    WHERE (p.lot, p.sub_lot) IN (
        SELECT UNNEST(lots), UNNEST(sublots)
    );
END;

$$ LANGUAGE plpgsql;
