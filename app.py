# app.py 
# the http server written in python
import sys
import json
import socketserver
import socket
import _thread
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler

static_path = "static/"

port = 8080
# files = json.loads(open("files.json", "r").read())
file_types = json.loads(open("fileTypes.json", "r").read())
datasets = json.loads(open(static_path + "core/datasets.json", "r").read())
struct_data_formats = {
    "float32": "f",
    "uint8": "c"
}


def get_index(x, y, z, size):
    return x * size["y"] * size["z"] + y * size["z"] + z


def get_pos(i, size):
    return (
        i//(size["y"]*size["z"]),
        (i//size["z"]) % size["y"],
        i % size["z"]
    )


def get_file_desc(files, name):
    for file in files:
        if file["path"] == name:
            return file
    else:
        return {}


# this is a simple http request handler class using the http.server interface
class requestHandler(BaseHTTPRequestHandler):
    # method to handle requests for static files
    # the paths in the url directly translate to files under the static_path attribute
    def do_GET(self):
        file_name = self.path[1:]
        try:
            # file_desc = get_file_desc(files, file_name)
            # get the extension from the file
            extension = self.path.split(".")[1]
            file_desc = file_types[extension]
            full_path = static_path + self.path[1:]
            print(full_path)
            # if not file_desc:
            #     raise OSError("file not in directory")
            if file_desc["encoding"]:
                file = open(full_path, "r")
                self.send_response(200)
                self.send_header("content-type", file_desc["contentType"])
                self.end_headers()
                self.wfile.write(bytes(file.read(), file_desc["encoding"]))
                file.close()
            else:
                file = open(full_path, "rb")
                self.send_response(200)
                self.send_header("content-type", file_desc["contentType"])
                self.end_headers()
                self.wfile.write(file.read())
                file.close()

        except OSError:
            self.send_response(404)
            self.end_headers()

    # POST is used to transfer data to the client
    # requests are only valid to the /data path
    # the body of data requests is in JSON form:
    # {
    #   *name: {dataset name},
    #   *mode: "whole"/"threshold"/£blocks,
    #   cellScale: int,
    #   threshold: float,
    #   blocks: array<int>
    # }
    def do_POST(self):
        if self.path == "/data":
            # the POST query is to the correct path
            # gets the size of the POST body
            content_length = int(self.headers['Content-Length'])
            if content_length > 0:
                # reads POST body to a dict
                request = json.loads(self.rfile.read(content_length))
                # check if the name given corresponds to a dataset
                if request["name"] in datasets:
                    if request["mode"] == "whole":
                        # a version of the whole dataset is required
                        self.handleWholeDataRequest(request)
                        return
                    elif request["mode"] == "threshold":
                        # just data around the threshold
                        self.handleThresholdDataRequest(request)
                        return
                    elif request["mode"] == "blocks":
                        # just data around the threshold
                        self.handleBlocksDataRequest(request)
                        return
        # if failed at any point, its a bad request (400)
        self.send_response(400)
        self.end_headers()

    # method called when the client sends a POST request for the whole data at a
    # particular resolution (cellScale)
    def handleWholeDataRequest(self, request):
        # create a response object
        response = {}
        # get dataset info
        data_info = datasets[request["name"]]
        # load the dataset TODO: load chunks at a time
        file = open(static_path + data_info["path"], "rb")
        if request["cellScale"] == 1:
            # if the cell scale is 1, the whole data is needed
            self.wfile.write(file.read())
            file.close()
        else:
            # else need to send only requested bytes

            # create alias vars to shorten code
            size = data_info["size"]
            cs = request["cellScale"]
            
            # get size of reduced data
            size_red = {
                "x": int(np.floor(size["x"]/request["cellScale"])),
                "y": int(np.floor(size["y"]/request["cellScale"])),
                "z": int(np.floor(size["z"]/request["cellScale"]))
            }
            vol_red = int(size_red["x"]*size_red["y"]*size_red["z"])

            # load bytes into am array of the correct type
            if data_info["dataType"] == "float32":
                data = np.frombuffer(file.read(), dtype=np.float32)
                output = np.empty(vol_red, dtype=np.float32)
            elif data_info["dataType"] == "uint8":
                data = np.frombuffer(file.read(), dtype=np.uint8)
                output = np.empty(vol_red, dtype=np.uint8)
            
            file.close()

            # extract the correct values and package into the output
            for i in range(size_red["x"]):
                for j in range(size_red["y"]):
                    for k in range(size_red["z"]):
                        val = data[i*cs * size["y"] * size["z"] + j*cs * size["z"] + k*cs]
                        output[int(i * size_red["y"] * size_red["z"] + j * size_red["z"] + k)] = val
            
            self.send_response(200)
            self.send_header("content-type", "applcation/octet-stream")
            self.end_headers()
            
            # write to the output stream
            self.wfile.write(output.data)

    def handleThresholdDataRequest(self, request):
        data_info = datasets[request["name"]]
        # load the dataset TODO: load chunks at a time
        data_file = open(static_path + data_info["path"], "rb")
        path = static_path + data_info["path"].split(".")[0] + "_limits.raw"
        limits_file = open(path, "rb")

        data_type = ""

        # load bytes into am array of the correct type
        if data_info["dataType"] == "float32":
            data_type = np.float32
        elif data_info["dataType"] == "uint8":
            data_type = np.uint8

        data = np.frombuffer(data_file.read(), dtype=data_type)
        limits = np.frombuffer(limits_file.read(), dtype=data_type)

        blockSize = {
            "x": 4,
            "y": 4,
            "z": 4
        }

        blocks = {
            "x": data_info["size"]["x"]//blockSize["x"],
            "y": data_info["size"]["y"]//blockSize["y"],
            "z": data_info["size"]["z"]//blockSize["z"]
        }

        limits.shape = (blocks["x"]*blocks["y"]*blocks["z"], 2)

        # active_ids = []
        fine_data = []

        l = 0
        r = 0
        for i_b in range(blocks["x"]):
            for j_b in range(blocks["y"]):
                for k_b in range(blocks["z"]):
                    # get index of current block in the limits list
                    index_b = get_index(i_b, j_b, k_b, blocks)
                    # extract the left and right values of the interval
                    # for that block
                    l = limits[index_b][0]
                    r = limits[index_b][1]
                    # if the threshold is not within the limits for this block
                    # continue onto the next block
                    if l > request["threshold"] or r < request["threshold"]:
                        continue
                    # loop through datapoints local to each block that is
                    # active and add to fine_data
                    for i_l in range(blockSize["x"]):
                        for j_l in range(blockSize["y"]):
                            for k_l in range(blockSize["z"]):
                                i = i_l + i_b * blockSize["x"]
                                j = j_l + j_b * blockSize["y"]
                                k = k_l + k_b * blockSize["z"]
                                index = get_index(i, j, k, data_info["size"])
                                fine_data.append(data[index])

        self.send_response(200)
        self.send_header("content-type", "applcation/octet-stream")
        self.end_headers()
        
        self.wfile.write(np.array(fine_data, dtype=data_type).data)
        data_file.close()
        limits_file.close()


    def handleBlocksDataRequest(self, request):
        data_info = datasets[request["name"]]
        # load the dataset TODO: load chunks at a time
        # data_file = open("data/" + data_info["path"], "rb")
        # path = "data/" + data_info["path"].split(".")[0] + "_limits.raw"

        data_file = open(static_path + data_info["path"].split(".")[0] + "_blocks.raw", "rb")

        data_type = None

        # load bytes into am array of the correct type
        if data_info["dataType"] == "float32":
            data_type = np.float32
        elif data_info["dataType"] == "uint8":
            data_type = np.uint8

        data = np.frombuffer(data_file.read(), dtype=data_type)

        blockSize = {
            "x": 4,
            "y": 4,
            "z": 4
        }
        block_vol = blockSize["x"] * blockSize["y"] * blockSize["z"]

        blocks = {
            "x": data_info["size"]["x"]//blockSize["x"],
            "y": data_info["size"]["y"]//blockSize["y"],
            "z": data_info["size"]["z"]//blockSize["z"]
        }

        # active_ids = []
        fine_data = np.empty(len(request["blocks"])*blockSize["x"]*blockSize["y"]*blockSize["z"], dtype=data_type)
        # num = 0
        # for id in request["blocks"]:
        #     block_pos = get_pos(id, blocks)
        #     for i_l in range(blockSize["x"]):
        #         for j_l in range(blockSize["y"]):
        #             for k_l in range(blockSize["z"]):
        #                 i = i_l + block_pos[0] * blockSize["x"]
        #                 j = j_l + block_pos[1] * blockSize["y"]
        #                 k = k_l + block_pos[2] * blockSize["z"]
        #                 index = get_index(i, j, k, data_info["size"])
        #                 fine_data[num] = data[index]
        #                 num += 1

        for i in range(len(request["blocks"])):
            id = request["blocks"][i]
            if type(id) is not int:
                print(type(id))
                continue
            fine_data[i*block_vol:(i+1)*block_vol] = data[id*block_vol:(id+1)*block_vol]


        self.send_response(200)
        self.send_header("content-type", "applcation/octet-stream")
        self.end_headers()
        
        #print(fine_data[:40])
        self.wfile.write(fine_data.data)

        data_file.close()

def main():
    # create a server object and tell it to listen on current local ip at port 
    # uses the request handler class defined above
    server = HTTPServer(("localhost", port), requestHandler)
    try:
        # print where the server is listening on
        print("server listening on: %s:%s" % (server.server_address[0], server.server_port))
        # run the server
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        server.server_close()
        print("server closed")
        sys.exit()


if __name__ == "__main__":
    main()

# HTTP server
#   will serve the static files
#   will handle the connection upgrade to WS
#
# WS server
#   send information about datasets (stored in JSON)
#       overall size
#       cell dimensions
#       dataType
#   purpose is to send data or parts of the dataset needed by the client
#   able to send the whole dataset at a given grid resolution
#   able to send small bits too in one form or another
#
# Data management
#   way to map threshold values to specific cells or blocks of data
#   create optimised datastructures to search through
#       span space
#       interval table
#       octree

# Program flow
#   setup:
#      client joins and gets the correct static files
#      sets up environment
#      user selects a dataset to use
#      sends a request to the server for a coarse view of the whole dataset
#          dataset name
#          required cell scale (calculated on client based on availale space)
#              maybe just dedicate one buffer to coarse and one for fine part
#      server responds and data is stored in a coarse dataset buffer
#   marching:
#       coarse grid is marched using dynamic resolution
#       when slider stops moving of dthreshold/dt < val:
#           if cell scale of coarse grid > 1:
#               request the missing values in the region of the threshold 
#                   server traverses its representation of the data
#                   gets the blocks that are active (4^3)
#               fill another buffer with the fine grid around the isosurface
#               march the fine buffer
#                   need altered marching cubes algorithm





# # the socket object the server will listen on for both http and ws
    # s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # # binds the socket to a particular ip and port#
    # s.bind((socket.gethostname(), port))

    # # queue up 5 connections max before refusing more
    # s.listen(5)

    # try:
    #     while True:
    #         # accept connections from outside
    #         # returns the client socket object and the client's address
    #         (clientSocket, address) = s.accept()
    #         # spawn new thread to handle the connection
    #         _thread.start_new_thread(handler, (clientSocket,address))
    # except KeyboardInterrupt:
    #     s.close()
    #     print("server closed")
    #     sys.exit()