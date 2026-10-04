import unittest
from pydantic import ValidationError
from app.contracts import Query
from app.semantic import MockSemanticClient

def request(**changes):
    values = dict(metrics=['revenue', 'reported_profit', 'reported_profit_margin'],
                  start_date='2014-10-01', end_date='2014-12-31', market='EU')
    values.update(changes)
    return Query(**values)

class ContractTests(unittest.TestCase):
    def test_weighted_margin_and_filter(self):
        result = MockSemanticClient().execute(request())
        self.assertEqual(result.rows, [{'revenue': '1000', 'reported_profit': '185',
                                        'reported_profit_margin': '18.500'}])
        self.assertEqual(result.source, 'mock_fixture')

    def test_inclusive_date_and_zero_denominator(self):
        result = MockSemanticClient().execute(request(start_date='2014-12-31'))
        self.assertEqual(result.rows[0]['reported_profit_margin'], None)
        self.assertEqual(result.rows[0]['reported_profit'], '-5')

    def test_no_data(self):
        result = MockSemanticClient().execute(request(market='Canada'))
        self.assertEqual(result.status, 'no_data')
        self.assertEqual(result.rows, [])

    def test_truncation_is_explicit(self):
        result = MockSemanticClient().execute(request(dimensions=['category'], limit=1))
        self.assertEqual(result.total_groups, 2)
        self.assertEqual(len(result.rows), 1)
        self.assertTrue(result.truncated)

    def test_forbidden_and_invalid_requests(self):
        invalid = [dict(metrics=['material_cost']), dict(dimensions=['sql']),
                   dict(sql='SELECT * FROM orders'), dict(limit=1001),
                   dict(limit=True), dict(limit=0), dict(market='Europe'),
                   dict(start_date='2015-01-01'), dict(start_date='2011-01-01'),
                   dict(metrics=['revenue', 'revenue']), dict(metrics=[])]
        for changes in invalid:
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                request(**changes)

    def test_shipping_does_not_reduce_profit_again(self):
        result = MockSemanticClient().execute(request(metrics=['reported_profit', 'shipping_cost']))
        self.assertEqual(result.rows[0], {'reported_profit': '185', 'shipping_cost': '27'})

    def test_repeatability_excluding_request_identifier(self):
        client = MockSemanticClient()
        a, b = client.execute(request()), client.execute(request())
        self.assertNotEqual(a.request_id, b.request_id)
        self.assertEqual(a.model_dump(exclude={'request_id'}), b.model_dump(exclude={'request_id'}))

if __name__ == '__main__':
    unittest.main()
