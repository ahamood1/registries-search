FROM python:3.13-bullseye AS development_build

USER root

ARG VCS_REF="missing"
ARG BUILD_DATE="missing"

ENV VCS_REF=${VCS_REF}
ENV BUILD_DATE=${BUILD_DATE}
ENV PORT=8080

LABEL org.label-schema.vcs-ref=${VCS_REF} \
    org.label-schema.build-date=${BUILD_DATE}

ARG APP_ENV \
  # Needed for fixing permissions of files created by Docker:
  UID=1000 \
  GID=1000
  
ENV APP_ENV=${APP_ENV} \
  # python:
  PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PYTHONDONTWRITEBYTECODE=1 \
  # pip:
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  PIP_DEFAULT_TIMEOUT=100 \
  PIP_ROOT_USER_ACTION=ignore \
  # poetry:
  POETRY_VERSION=2.1.1 \
  POETRY_NO_INTERACTION=1 \
  POETRY_VIRTUALENVS_CREATE=false \
  POETRY_CACHE_DIR='/var/cache/pypoetry' \
  POETRY_HOME='/usr/local'

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Installing Oracle instant client
WORKDIR /opt/oracle
RUN apt-get update && apt-get install -y libaio1 gdb wget unzip \
  && wget https://download.oracle.com/otn_software/linux/instantclient/211000/instantclient-basiclite-linux.x64-21.1.0.0.0.zip \
  && wget https://download.oracle.com/otn_software/linux/instantclient/211000/instantclient-sqlplus-linux.x64-21.1.0.0.0.zip \
  && unzip instantclient-basiclite-linux.x64-21.1.0.0.0.zip \
  && rm -f instantclient-basiclite-linux.x64-21.1.0.0.0.zip \
  && unzip instantclient-sqlplus-linux.x64-21.1.0.0.0.zip \
  && rm -f instantclient-sqlplus-linux.x64-21.1.0.0.0.zip \
  && cd /opt/oracle/instantclient* \
  && rm -f *jdbc* *occi* *mysql* *README *jar uidrvci genezi adrci \
  && echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf \
  && ldconfig

RUN apt-get update && apt-get upgrade -y \
  && apt-get install --no-install-recommends -y \
    bash \
    brotli \
    build-essential \
    curl \
    gettext \
    git \
    libpq-dev \
    wait-for-it \
  && curl -sSL 'https://install.python-poetry.org' | python - \
  && poetry --version \
# Cleaning cache:
&& apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
&& apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /code

RUN groupadd -g "${GID}" -r web \
  && useradd -d '/code' -g web -l -r -u "${UID}" web \
  && chown web:web -R '/code' \
  && chown web:web -R '/opt/oracle'

# Copy only requirements, to cache them in docker layer
COPY --chown=web:web ./poetry.lock ./pyproject.toml /code/

COPY --chown=web:web ./src /code/src
COPY --chown=web:web ./README.md /code

RUN mkdir /code/cache && chown web:web /code/cache

# Project initialization:
RUN --mount=type=cache,target="$POETRY_CACHE_DIR" \
  echo "$APP_ENV" \
  && poetry version \
  # Install deps:
  && poetry run pip install -U pip \
  && poetry install \
    $(if [ -z ${APP_ENV+x} ] | [ "$APP_ENV" = 'production' ]; then echo '--only main'; fi) \
    --no-interaction --no-ansi

# Running as non-root user:
USER web

# The following stage is only for production:
FROM development_build AS production_build
COPY --chown=web:web . /code

CMD python /code/data_import_handler.py
