from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Reward(Base):
    __tablename__ = 'rewards'
    id = Column(Integer, primary_key=True, index=True)
    model = Column(String, index=True)
    symbol = Column(String, index=True)
    reward = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Leaderboard(Base):
    __tablename__ = 'leaderboard'
    id = Column(Integer, primary_key=True, index=True)
    model = Column(String, index=True)
    symbol = Column(String, index=True)
    score = Column(Float)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
