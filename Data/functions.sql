CREATE FUNCTION find_plasmids(lots INTEGER[], sublots TEXT[])
RETURNS TABLE (bag VARCHAR(10), lot INTEGER, sublot VARCHAR(10)) as $$
BEGIN
    RETURN QUERY
    SELECT u.bag, u.lot, u.sublot
    FROM plasmids p
    WHERE (p.lot, p.sublot) IN (
        SELECT UNNEST(lots), UNNEST(sublots)
    );
END;

$$ LANGUAGE plpgsql;
