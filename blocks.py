# blocks.py
# this program is used to create a file where blocks of data are more easily accessed

import numpy as np
import json
import sys
import time
from vtkmodules.vtkIOXML import vtkXMLStructuredPointsReader
# from vtk import vtkStructuredPointsReader
# from vtk.util import numpy_support as VN

# path = "data\silicium_98x34x34_uint8"
# ext = ".raw"

data_types = {
    "uint8": np.uint8,
    "float32": np.float32,
    "int16": np.int16
}

blockSize = {
    "x": 4,
    "y": 4,
    "z": 4
}


def getIndex(x, y, z, size):
    return x * size["y"] * size["z"] + y * size["z"] + z


def main(data_name):
    # load data info from dataset name
    datasets = json.loads(open("static/data/datasets.json", "r").read())
    try:
        data_info = datasets[data_name]
        size = data_info["size"]
        data_type_str = data_info["dataType"]
        data_type = data_types[data_type_str]
        path, ext = data_info["path"].split(".")
    except KeyError:
        # exit if something is wrong
        print("sorry, dataset does not exist in datsets.json or is malformed")
        return

    blocks = {
        "x": size["x"]//blockSize["x"],
        "y": size["y"]//blockSize["y"],
        "z": size["z"]//blockSize["z"]
    }

    # load data in buffer
    try:
        file_path = "static/" + path + "." + ext
        print("file path: " + file_path)
        data = np.frombuffer(open(file_path, "rb").read(), dtype=data_type)
    except OSError:
        print("could not find file")
        return

    block_vol = blockSize["x"] * blockSize["y"] * blockSize["z"]

    # create output buffer
    output = np.empty(
        blocks["x"] * blocks["y"] * blocks["z"] * block_vol,
        dtype=data_type
    )

    print("starting translation process")
    start_time = time.time()
    # keeps a track of the index in the output
    out_ind = 0
    # loop through each block and get its limits
    for i_b in range(blocks["x"]):
        for j_b in range(blocks["y"]):
            for k_b in range(blocks["z"]):
                # loop through all cells in each block
                for i_l in range(blockSize["x"]):
                    for j_l in range(blockSize["y"]):
                        for k_l in range(blockSize["z"]):
                            i = i_l + i_b * blockSize["x"]
                            j = j_l + j_b * blockSize["y"]
                            k = k_l + k_b * blockSize["z"]
                            index = getIndex(i, j, k, size)
                            output[out_ind] = data[index]
                            out_ind += 1
        print("\r" + "%.1f" % (i_b/(blocks["x"]-1)*100) + "% complete", end="")

    print("100% done, writing to file")
    print("took " + "%.1f" % (time.time()-start_time) + "s")
    # save to binary file
    with open("static/" + path + "_blocks" + "." + ext, "wb") as file:
        file.write(output.data)

    print("blocks file generation complete")


if __name__ == "__main__":
    args = sys.argv
    if args[0] == "blocks.py":
        main(args[1])
    else:
        main(args[0])
    input("...press any key to exit...")