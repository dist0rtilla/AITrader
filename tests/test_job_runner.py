import unittest
from backend.services import job_runner
import uuid

class TestJobRunner(unittest.TestCase):
    def test_enqueue_and_queue(self):
        job_id = str(uuid.uuid4())
        job_runner.enqueue_job('test', job_id, {'foo': 'bar'})
        # read from redis list tail
        item = job_runner.r.lindex(job_runner.QUEUE_KEY, -1)
        self.assertIsNotNone(item)
        import json
        j = json.loads(item)
        self.assertEqual(j['id'], job_id)
        # cleanup
        job_runner.r.rpop(job_runner.QUEUE_KEY)
        job_runner.r.delete(f'job:{job_id}')

if __name__ == '__main__':
    unittest.main()
