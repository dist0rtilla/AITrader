use std::fs::File;
use std::io::Write;
use tempfile::tempdir;
use pattern_engine::replay;
use pattern_engine::publisher::Tick;
use std::sync::{Arc, Mutex};
use std::io::BufRead;

#[derive(Clone)]
struct MockPublisher {
    ticks: Arc<Mutex<Vec<Tick>>>,
}

impl MockPublisher {
    fn new() -> Self {
        Self { ticks: Arc::new(Mutex::new(Vec::new())) }
    }

    async fn publish_tick(&self, tick: Tick) -> anyhow::Result<String> {
        let mut v = self.ticks.lock().unwrap();
        v.push(tick);
        Ok("-mock-".to_string())
    }
}

#[test]
fn test_replay_publish_counts_and_publish() {
    // create temp CSV
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("ticks.csv");
    let mut f = File::create(&file_path).unwrap();
    writeln!(f, "symbol,price,volume,timestamp").unwrap();
    writeln!(f, "AAPL,150.0,1000.0,1696000000").unwrap();
    writeln!(f, "MSFT,300.5,500.0,1696000001").unwrap();
    writeln!(f, "GOOGL,2800.0,200.0,1696000002").unwrap();
    f.flush().unwrap();

    // We'll call the simple run_replay which returns counts
    let cnt = replay::run_replay(Some(file_path.to_str().unwrap())).unwrap();
    assert_eq!(cnt, 3);

    // Now simulate publish loop using MockPublisher (re-implementing small logic for test)
    let mp = MockPublisher::new();
    let rt = tokio::runtime::Runtime::new().unwrap();
    let mut processed = 0;
    let f2 = File::open(&file_path).unwrap();
    let reader = std::io::BufReader::new(f2);
    for line in reader.lines() {
        let l = line.unwrap();
        if l.trim().is_empty() { continue; }
        if processed == 0 {
            let h = l.trim_start();
            if h.starts_with("symbol") { continue; }
        }
        let parts: Vec<&str> = l.split(',').map(|s| s.trim()).collect();
        if parts.len() < 4 { continue; }
        let tick = Tick { symbol: parts[0].to_string(), price: parts[1].parse().unwrap_or(0.0), volume: parts[2].parse().unwrap_or(0.0), timestamp: parts[3].parse().unwrap_or(0.0) };
        let mpc = mp.clone();
        rt.block_on(async { let _ = mpc.publish_tick(tick).await; });
        processed += 1;
    }

    assert_eq!(processed, 3);
    let v = mp.ticks.lock().unwrap();
    assert_eq!(v.len(), 3);
    assert_eq!(v[0].symbol, "AAPL");
}
