from setuptools import setup, find_packages

setup(
    name="ai_trader",
    version="0.0.1",
    packages=find_packages(exclude=("tests", "docs", "alembic")),
    include_package_data=True,
)
