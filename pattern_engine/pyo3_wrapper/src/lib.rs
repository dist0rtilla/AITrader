use pyo3::prelude::*;
use pattern_engine::run_replay as rust_run_replay;
use pattern_engine::run_replay_publish as rust_run_replay_publish;

/// Call the library run_replay function and return the processed row count.
#[pyfunction]
fn run_replay(py: Python, ticks_csv: Option<String>) -> PyResult<i32> {
    py.allow_threads(|| {
        match rust_run_replay(ticks_csv.as_deref()) {
            Ok(n) => Ok(n),
            Err(e) => Err(pyo3::exceptions::PyRuntimeError::new_err(format!("replay error: {}", e))),
        }
    })
}

#[pyfunction]
fn run_replay_publish(py: Python, ticks_csv: Option<String>, redis_url: Option<String>) -> PyResult<i32> {
    py.allow_threads(|| {
        match rust_run_replay_publish(ticks_csv.as_deref(), redis_url.as_deref()) {
            Ok(n) => Ok(n),
            Err(e) => Err(pyo3::exceptions::PyRuntimeError::new_err(format!("replay publish error: {}", e))),
        }
    })
}

#[pymodule]
fn pattern_engine_pyo3(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(run_replay, m)?)?;
    m.add_function(wrap_pyfunction!(run_replay_publish, m)?)?;
    Ok(())
}
