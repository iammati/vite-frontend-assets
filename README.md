## `vitejs/vite` for PHP environments in DDEV

The frontend-assets support out-of-the-box HMR `hot module replacement` which is shipped by `vitejs/vite`.

**Working proof-of-concept running on ddev is available here: https://github.com/iammati/vite-ddev<br>
run `git clone https://github.com/iammati/vite-ddev . && ddev start && ddev frontend-dev`<br>
in an empty directory and enjoy
extreme frontend developer-experience thanks to vitejs/vite!**

#### Requirements:
- Working [DDEV-Local](http://ddev.readthedocs.io/) instance
- PHP 7.4 / 8.0
- dotenv (.env) file

<hr>

#### Instructions
1. Create a new DDEV project (using `ddev config`) and its post-configuration steps
2. Clone this repo here via `git clone https://github.com/iammati/vite-frontend-assets`
3. Create a new `.ddev/docker-compose.hmr.yaml` file and add the following content:

```yaml
version: '3.6'

services:
  web:
    expose: 
      - 3000
    environment:
      - HTTP_EXPOSE=${DDEV_ROUTER_HTTP_PORT}:80,${DDEV_MAILHOG_PORT}:8025,2999:3000
      - HTTPS_EXPOSE=${DDEV_ROUTER_HTTPS_PORT}:80,${DDEV_MAILHOG_HTTPS_PORT}:8025,3000:3000
```

<br>

##### DDEV – PNPM installation

Create the new file `.ddev/web-build/Dockerfile` and add the following content:

```Dockerfile
ARG BASE_IMAGE
FROM $BASE_IMAGE

# Installing pnpm inside the web-container
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm &&\
    # making sure to have the latest pnpm version and updating if possible
    pnpm add -g pnpm &&\
    # enable pre/post hooks for pnpm's run-script lifecycle
    pnpm config set enable-pre-post-script true
```

<br>

##### DDEV – web-commands

Create the new `.ddev/commands/web/frontend-dev` file and add the following content:

```bash
#!/bin/bash

## Description: Extremely fast frontend-development via dev-server from vitejs/vite. It's really fast!
## Usage: frontend-dev
## Example: "ddev frontend-dev"

## The ampersand (&-char) makes the process run in the background.
## So basically we run the production-build as watcher + file changes
## to update our /public/dist compiled files
## while running a dev-server for development.
cd app/frontend && pnpm run dev
```

And the `.ddev/commands/web/frontend-prod` file with:

```bash
#!/bin/bash

## Description: Preparing compiled assets (under /public/dist) to be ready-to-use for production via vitejs/vite.
## Usage: frontend-prod
## Example: "ddev frontend-prod"

## Preparing compiled files under /public/dist
## being ready to be deployed towards production-env
cd app/frontend && pnpm run prod
```

You may run `ddev start` now.

#### Adding compiled assets into frontend

This requires to extend your `.env` file with the following:
```.env
APP_ENV=development
PROTOCOL_SCHEME=https
BASE_DOMAIN=my-project.ddev.site
HMR_PORT=3000
```

If you found the right spot where you can place some PHP logic to hook into your DOM's `head` and `</body.` add first the required `ViteService` class:

```php
<?php

declare(strict_types=1);

namespace Site\Frontend\Service;

use Exception;

class ViteService
{
    protected string $publicPath = '/var/www/html/public';
    protected string $indexEntry = 'src/TypeScript/app.ts';

    /**
     * @throws Exception
     */
    public static function render(string $resolve)
    {
        if (!in_array($resolve, ['head', 'body'])) {
            throw new Exception(
                sprintf(
                    'Can not resolve "%s". Available values are: "head" | "body".',
                    $resolve
                ),
                1635708161
            );
        }

        $publicPath = self::$publicPath;
        $indexEntry = self::$indexEntry;
        $distPath = "${publicPath}/dist";

        $devServerIsRunning = self::isDevServerRunning($distPath);

        if ($devServerIsRunning) {
            $devServerUri = self::getDevServerUri();

            if ($resolve === 'head') {
                return <<<HTML
                    <script type="module" src="{$devServerUri}/dist/@vite/client"></script>
                HTML;
            } else if ($resolve === 'body') {
                return <<<HTML
                    <script type="module" src="{$devServerUri}/dist/{$indexEntry}"></script>
                HTML;
            }

            return;
        }

        $manifest = json_decode(file_get_contents(
            "${distPath}/manifest.json"
        ), true);

        $entry = $manifest[$indexEntry];

        if ($resolve === 'head' && isset($entry['css'])) {
            return <<<HTML
                <link rel="stylesheet" href="/dist/{$entry['css'][0]}">
            HTML;
        }

        if ($resolve === 'body') {
            return <<<HTML
                <script type="module" src="/dist/{$entry['file']}"></script>
            HTML;
        }
    }

    /**
     * Retrieving via dot-env (.env) file the protocol-scheme
     * and base-domain to know where the vite-client js is deposited.
     * 
     * The env-value PROTOCOL_SCHEME represents (probably due to DDEV-Local)
     * "https" while the BASE_DOMAIN can be anything e.g. project-name.ddev.site
     * the server-port will be appended for vitejs/vite + HMR.
     */
    private static function getDevServerUri(): string
    {
        return env('PROTOCOL_SCHEME').'://'.env('BASE_DOMAIN').':'.env('HMR_PORT');
    }

    /**
     * Handling if the current (frontend-)request was made while
     * the dev-server (vitejs/vite watcher) is running or not.
     */
    private static function isDevServerRunning(string $distPath): bool
    {
        $hotPath = "${distPath}/hot";
        $devServerIsRunning = false;

        $isDevelopment = env('APP_ENV') === 'development';

        if ($isDevelopment && file_exists($hotPath)) {
            try {
                $devServerIsRunning = trim(file_get_contents($hotPath)) === 'development';
            } catch (Exception $e) {
                throw $e;
            }
        }

        return $devServerIsRunning;
    }
}
```

Call the necessary static method `ViteService::render('head')` and `ViteService::render('body')` inside your HTML `head` tag and before your `</body>` tags so the service can eage the loadtime for the vitejs client functionality before your custom js is loaded.

Run `ddev frontend-dev`, open your `my-project.ddev.site` URL in your favorite browser and enjoy the HMR server in DDEV!

**NOTE:** If you run into any problem/error feel free to create an issue :)
