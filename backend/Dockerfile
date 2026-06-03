FROM python:3.10

ENV PYTHONUNBUFFERED=1

WORKDIR /app/

ENV PYTHONPATH=/app

RUN pip install uv

COPY ./pyproject.toml ./uv.lock ./alembic.ini /app/
COPY ./app /app/app
COPY ./scripts /app/scripts

RUN uv sync --frozen

ENV PATH="/app/.venv/bin:$PATH"

CMD ["uv", "run", "fastapi", "run", "--workers", "4", "app/main.py"]