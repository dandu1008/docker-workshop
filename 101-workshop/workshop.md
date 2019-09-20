## Part 1: Building a simple Nginx image

Using Nginx we can serve static files via the web.

Create a new empty directory `simple-nginx`. Inside the directory create _Dockerfile_ for building a docker image using `nginx:alpine` as a base image and moving all your files from build context directory `.` to `/usr/share/nginx/html` path in the image.

<details><summary>Solution</summary>
<p>

Dockerfile:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
```

</p>
</details>

Build the container and give it `simple-nginx` tag.

<details><summary>Solution</summary>
<p>

```bash
$ docker build . -t simple-nginx

Sending build context to Docker daemon  2.048kB
Step 1/2 : FROM nginx:alpine
 ---> d87c83ec7a66
Step 2/2 : COPY . /usr/share/nginx/html/
 ---> Using cache
 ---> 74378a9e5daa
Successfully built 74378a9e5daa
Successfully tagged simple-nginx:latest
```

</p>
</details>

Create the container exposing port 80 using `simple-nginx` as an image.

<details><summary>Solution</summary>
<p>

```bash
$ docker run -p 80:80 nginx-simple:latest
```

</p>
</details>

If you navigate your browser to http://localhost/Dockerfile you will notice that it is automatically downloaded. This happens because we copied all files from the working directory using `COPY` command.

Create docker ignore file to filter our files that we don't want to move into the image. In this case, add ignore for `Dockerfile`.

Build the image again and check if the file is still available via the browser. Hopefully this time you should see 404 error.

<details><summary>Solution</summary>
<p>

.dockerfile

```docker
Dockerfile
```

</p>
</details>

Let's create a new file called `index.html` and add any HTML you want to it. If you run the latest image without building, the newly created files won't exist. You would have to build a new image every time you make changes during development. We can optimise this by mounting volumes from your OS into the container.

Run the latest `simple-nginx` image while mounting the current directory to `/usr/share/nginx/html` container path.

<details><summary>Solution</summary>
<p>

While inside `simple-nginx` directory:

```bash
docker run -p 80:80 -v $(pwd):/usr/share/nginx/html simple-nginx:latest
```

</p>
</details>

Now if you navigate to http://localhost/Dockerfile the file is being exposed again. Mounting volumes move all files regardless of ignore rules.

---

## Part 2: Building react app

Inside `react-app-hello-world` create _Dockerfile_. Use `node:lts-alpine` as the base image.

Create _.dockerignore_ file ignoring `node_modules` directory.

When building an image you should:

- copy all files to `/app` directory,
- install Node dependencies by running `yarn install`,
- build the app by running `yarn build`.

Build the image by running `docker build . -t hello-world:v1`

P.S. Don't forget to set `WORKDIR` appropriately so when commands are run they run in the correct directory.

<details><summary>Solution</summary>
<p>

Dockerfile:

```dockerfile
FROM node:lts-alpine

COPY . /app/

WORKDIR /app/

RUN yarn install

RUN yarn build
```

</p>
</details>

To verify that the react application has been build run `ls /app/build/` inside the container. You will see built react app.

<details><summary>Solution</summary>
<p>

```bash
$ docker run hello-world:v1 ls /app/build/
```

</p>
</details>

At the moment our Dockerfile isn't optimised and changing any project files will install dependencies again. We want to only copy `package.json` and `yarn.lock` files, only run `yarn install` and then copy all remaining files into docker, allowing Docker to cache intermediate images. So next time if package.json and yarn.lock files haven't change it won't install dependencies.

<details><summary>Solution</summary>
<p>

Dockerfile:

```dockerfile
FROM node:lts-alpine

WORKDIR /app/

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build
```

</p>
</details>

Now running docker build again without changing package.json or yarn.lock won't install packages making whole build process significantly faster.

Let's run react app build process again while also transferring resulting artefacts from /build directory. To move built application to host OS, we can run container while mounting `$(pwd)/build/` to `/app/build/` path in container. And running `yarn build` command again.

<details><summary>Solution</summary>
<p>

```bash
docker run -v $(pwd)/build:/app/build/ hello-world:v1 yarn build
```

</p>
</details>

---

## Part 3: Serving react app

We have a pipeline for building react application, but at the moment it's not served via the browser. In this part, we will be integrating simple Nginx server with react application build pipeline. To create a multi-stage docker image build process.

Continuing with _Dockerfile_ we built in part 2 let's give our initial build stage a name `build` and add another build stage called `serve` using `nginx:alpine` as the base image.

Copy all files from `build` image from `/app/build` path into `/usr/share/nginx/html/`

<details><summary>Solution</summary>
<p>

```dockerfile
FROM node:lts-alpine AS build

WORKDIR /app/

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build


FROM nginx:alpine AS serve

COPY --from=build /app/build/ /usr/share/nginx/html/
```

</p>
</details>

Build the image and give it a `hello-world-nginx:v1` tag.

Run the image and navigate your browser to http://localhost/ where you should see react application being served from Nginx.

---

## Part 4: Docker compose

In this part, we will be using docker-compose to connect ants application with redis. For this, we prepared a simple typescript/nodejs application that connects to redis and prints the names of all connected clients into the terminal.

Navigate to `database-what` directory. You will need to create a _Dockerfile_ that install all packages `yarn install` and builds the application by running `yarn build`. Finish your _Dockerfile_ with _CMD_ instruction, to run `yarn start`.

<details><summary>Solution</summary>
<p>

```dockerfile
FROM node:lts-alpine AS build

WORKDIR /app/

COPY package.json yarn.lock /app/

RUN yarn install

COPY . .

RUN yarn build

CMD ["yarn", "start"]
```

</p>
</details>

Because our application needs redis and we don't want to add redis-server to the same image that our application is so that we could scale the number of apps independently from our redis.

Redis already provides a docker image `redis:latest` to use to launch redis server.

Create _docker-compose.yml_ file and add a service named `redis` that uses `redis:latest` image.

<details><summary>Solution</summary>
<p>

```yaml
version: "3.7"

services:
  redis:
    image: redis:latest
```

</p>
</details>

Running `docker-compose up` will download the redis docker image, create and start the container. You should see logs of redis server successfully starting. You can exit this by pressing <kbd>CTRL</kbd>+<kbd>C</kbd>.

At the moment redis application cannot be accessed outside of the Docker, so we need to get our application inside the docker network.

Extend your docker-compose file with new service called `app`, which instead of using a pre-built image, builds a new image there. Set _context_ to `.` and _dockerfile_ to `Dockerfile`.

<details><summary>Solution</summary>
<p>

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
```

</p>
</details>

To start the application we will also need to link our containers together so that when we start `app` it should also start `redis` container if it's not running. We can do this by updating the `depends_on:` list to include `redis` service.

To also make our application, aware where to find redis, we need to set environment variable `REDIS_HOST` to match the name of redis service which we set in previous steps, it should be `redis`.

<details><summary>Solution</summary>
<p>

```yaml
app:
  ...
  environment:
    REDIS_HOST: redis
  depends_on:
    - redis
```

</p>
</details>

Make it scale. Let's duplicate our app, give a new app `worker` name and update its launch command to `node scale.js`.

In one terminal launch the main application by running `docker-compose up app`. In another terminal run `docker-compose scale worker=5`. After a couple of seconds, you should see the main application with all connected clients. There should be a total of 6 (main+5 workers).

To stop scalled applications you can run `docker-compose scale worker=0`.

<details><summary>Solution</summary>
<p>

```yaml
worker:
  build:
    context: .
    dockerfile: Dockerfile
  command: ["node", "scale.js"]
  environment:
    REDIS_HOST: redis
  depends_on:
    - redis
```

</p>
</details>

To clean up you can run `docker-compose down`, you can also wait and explore your running containers using Kitematics before deleting them.

---

## Part 5: Docker GUI _Bonus_

While waiting for everyone to finish, you can take a look at Kitematic from Docker Desktop. It provides a graphical interface for Docker Hub where you can find almost any docker image imaginable.

You can also check running containers on your machine, tail-follow their logs and change basic settings such as port mapping, environment variables, volumes.

Try running some of the recommended images, some good examples to try: _Jenkins_, _Ghost_ or you could also launch Minecraft server. :)

https://github.com/docker/kitematic

---

## Part 6: Q & A

---

## Part 7: Feedback

Please let us know what you though of this new format. Either now or in private after.

![Docker](https://maraaverick.rbind.io/banners/nyan_docker_whale_gfycat.gif)
