# blocks.py
# this program is used to create a file where blocks of data are more easily accessed

import numpy as np
import json
import sys
import time
import os
from vtkmodules.vtkIOXML import vtkXMLStructuredGridReader
from vtk.util import numpy_support as VN
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

block_vol = blockSize["x"] * blockSize["y"] * blockSize["z"]


def getIndex(x, y, z, size):
    return x * size["y"] * size["z"] + y * size["z"] + z


# size is the dimensions of the dataset, blocksSize in blocks
# stride is number of commponents per element
def create_blocks_file(data, size, stride, name):
    # get size in blocks
    blocks = {
        "x": size["x"]//blockSize["x"],
        "y": size["y"]//blockSize["y"],
        "z": size["z"]//blockSize["z"]
    }

    # create output buffer
    output = np.empty(
        blocks["x"] * blocks["y"] * blocks["z"] * block_vol * stride,
        dtype=data.dtype
    )
    print("starting blocks translation process")
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

                            for x in range(stride):
                                output[stride*out_ind + x] = data[stride*index + x]

                            out_ind += 1
        print("\r" + "%.1f" % (i_b/(size["x"]-1)*100) + "% complete", end="")

    print("\nwriting to file")
    print("took " + "%.1f" % (time.time()-start_time) + "s")
    # save to binary file
    with open(name, "wb") as file:
        file.write(output.data)

    print("blocks file generation complete")


def create_limits_file(data, size, name):
    blocks = {
        "x": size["x"]//blockSize["x"],
        "y": size["y"]//blockSize["y"],
        "z": size["z"]//blockSize["z"]
    }
    # create output buffer
    output = np.empty([blocks["x"] * blocks["y"] * blocks["z"], 2], dtype=data.dtype)

    print("starting limits generation")
    start_time = time.time()
    # loop through each block and get its limits
    for i_b in range(blocks["x"]):
        for j_b in range(blocks["y"]):
            for k_b in range(blocks["z"]):
                limits = [None, None]
                index_b = getIndex(i_b, j_b, k_b, blocks)
                # loop through datapoints local to each block
                # goes through all points contained within that block
                # and also the points on the outside of the block as if the
                # threshold is crossed at the boundary then this block will
                # be needed
                for i_l in range(-1, blockSize["x"] + 1):
                    for j_l in range(-1, blockSize["y"] + 1):
                        for k_l in range(-1, blockSize["z"] + 1):
                            i = i_l + i_b * blockSize["x"]
                            j = j_l + j_b * blockSize["y"]
                            k = k_l + k_b * blockSize["z"]
                            if i < 0 or j < 0 or k < 0:
                                continue
                            elif i >= size["x"] or j >= size["y"] or k >= size["z"]:
                                continue
                            index = getIndex(i, j, k, size)
                            val = data[index]
                            # if (index_b == 16 + 24*8):
                            #     print(val)
                            if limits[0] is None or val < limits[0]:
                                limits[0] = val
                            if limits[1] is None or val > limits[1]:
                                limits[1] = val
                if not limits[1]:
                    limits[1] = limits[0]
                output[index_b] = limits
        print("\r" + "%.1f" % (i_b/(blocks["x"]-1)*100) + "% complete", end="")

    print()
    print("complete")
    print("took " + "%.1f" % (time.time()-start_time) + "s")

    # get overall limits for file
    overall_limits = [None, None]
    for i in range(blocks["x"] * blocks["y"] * blocks["z"]):
        low = output[i][0]
        high = output[i][1]
        if overall_limits[0] is None or low < overall_limits[0]:
            overall_limits[0] = low
        if overall_limits[1] is None or high > overall_limits[1]:
            overall_limits[1] = high

    print("low limit:", overall_limits[0])
    print("high limit:", overall_limits[1])

    # save to binary file
    with open(name, "wb") as file:
        file.write(output.data)

    print("limits file generation successful")


def create_raw_file(data, name):
    with open(name, "wb") as file:
        file.write(data)




def process_raw_file(data_info):
    size = data_info["size"]
    data_type_str = data_info["dataType"]
    data_type = data_types[data_type_str]
    path, ext = data_info["path"].split(".")

    # load data in buffer
    try:
        file_path = "static/" + path + "." + ext
        print("file path: " + file_path)
        data = np.frombuffer(open(file_path, "rb").read(), dtype=data_type)
    except OSError:
        print("could not find file")
        return

    create_blocks_file(data, size, 1, "static/" + path + "_blocks" + "." + ext)
    
    create_limits_file(data, size, "static/" + path + "_limits" + "." + ext)


def process_structured_grid_file(data_info):
    print(data_info)

    # for each original file containing one block each
    for i in range(len(data_info["originalFiles"])):
        original_path, ext = ("static/" + data_info["path"] + data_info["originalFiles"][i]).split(".")
        reader = vtkXMLStructuredGridReader()

        reader.SetFileName(original_path + "." + ext)
        reader.Update()
        data = reader.GetOutput()

        # print(data)
        # points_info = data.GetPoints()

        size_list = data.GetDimensions()
        size = {
            "x": size_list[2],
            "y": size_list[1],
            "z": size_list[0]
        }

        positions = np.zeros(data.GetNumberOfPoints()*3, np.float32)
        for j in range(data.GetNumberOfPoints()):
            positions[3*j:3*j + 3] = data.GetPoint(j)


        # convert the positions
        create_blocks_file(positions, size, 3, original_path + "_positions_blocks.raw")
        create_raw_file(positions, original_path + "_positions.raw")
        # convert point data
        attribute_name = "Density"
        point_data = VN.vtk_to_numpy(data.GetPointData().GetArray(attribute_name))
        create_raw_file(point_data, original_path + "_" + attribute_name + ".raw")
        create_blocks_file(point_data, size, 1, original_path + "_" + attribute_name + "_blocks.raw")
        create_limits_file(point_data, size, original_path + "_" + attribute_name + "_limits.raw")








def main(data_name):
    # load data info from dataset name
    datasets = json.loads(open("static/data/datasets.json", "r").read())
    data_info = None
    try:
        data_info = datasets[data_name]
    except KeyError:
        # exit if something is wrong
        print("sorry, dataset does not exist in datsets.json or is malformed")
        return

    dataset_type = data_info["type"]  # raw/structured grid

    if dataset_type == "raw":
        process_raw_file(data_info)
    elif dataset_type == "structuredGrid":
        process_structured_grid_file(data_info)
    else:
        print("unsupported file type")


if __name__ == "__main__":
    args = sys.argv
    if args[0] == os.path.basename(__file__):
        if len(args) == 1:
            print("run with dataset name as argument")
        else:
            main(args[1])
    else:
        main(args[0])
    input("...press any key to exit...")
