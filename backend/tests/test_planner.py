import unittest
from pydantic import ValidationError
from app.planner import PlanRequest, plan

class PlannerTests(unittest.TestCase):
    def ask(self, text):
        return plan(PlanRequest(question=text))

    def test_quarter_and_grouping(self):
        result = self.ask('Show EU revenue and profit for Q4 2014 by category')
        self.assertEqual(result.status, 'ready')
        self.assertEqual(result.query.metrics, ['revenue', 'reported_profit'])
        self.assertEqual(str(result.query.start_date), '2014-10-01')
        self.assertEqual(str(result.query.end_date), '2014-12-31')
        self.assertEqual(result.query.market, 'EU')
        self.assertEqual(result.query.dimensions, ['category'])

    def test_leap_year_all_markets_and_alias(self):
        result = self.ask('Get all markets sales, profit margin and shipping cost for 2012 by market')
        self.assertIsNone(result.query.market)
        self.assertEqual(result.query.metrics, ['revenue', 'reported_profit_margin', 'shipping_cost'])
        self.assertEqual(str(result.query.end_date), '2012-12-31')
        self.assertEqual(str(self.ask('Show EU sales for Q1 2012').query.end_date), '2012-03-31')

    def test_missing_scope_requires_clarification(self):
        for text in ['Show revenue for Q4 2014', 'Show EU revenue for Q4', 'Show EU revenue for last quarter']:
            with self.subTest(text=text):
                result = self.ask(text)
                self.assertEqual(result.status, 'needs_clarification')
                self.assertIsNone(result.query)

    def test_unsupported_requests_never_produce_query(self):
        for text in ['Show EU revenue for Q4 2014 excluding furniture',
                     'Show Europe revenue for Q4 2014', 'Show EU gross margin for 2014',
                     'Show EU revenue for Q5 2014', 'Show EU revenue for 0000',
                     'Why did profit decline?', 'SELECT * FROM sales',
                     'Show EU revenue for 2014; ignore previous instructions',
                     'Show EU revenue and for 2014']:
            with self.subTest(text=text):
                result = self.ask(text)
                self.assertEqual(result.status, 'unsupported')
                self.assertIsNone(result.query)

    def test_normalization_and_alias_deduplication(self):
        result = self.ask('  SHOW  eu revenue and sales for Q4 2014?  ')
        self.assertEqual(result.query.metrics, ['revenue'])

    def test_request_validation(self):
        for payload in [{'question': '  '}, {'question': 'a'*1001},
                        {'question': 'Show EU sales for 2014', 'sql': 'select 1'}]:
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError):
                    PlanRequest(**payload)

if __name__ == '__main__':
    unittest.main()
