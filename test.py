import numpy as np


def get_index(x, y, z, size):
    return x * size["y"] * size["z"] + y * size["z"] + z


data_file = open("data\silicium_98x34x34_uint8.raw", "rb")
limits_file = open("data\silicium_98x34x34_uint8_limits.raw", "rb")

data = np.frombuffer(data_file.read(), dtype=np.uint8)
limits = np.frombuffer(limits_file.read(), dtype=np.uint8)

data_info = {
    "size": {
        "x": 34,
        "y": 34,
        "z": 98
    }
}

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
print(blocks)

limits.shape = (blocks["x"]*blocks["y"]*blocks["z"], 2)

active_ids = []
fine_data = []

threshold = 120

l = 0
r = 0
for i_b in range(blocks["x"]):
    for j_b in range(blocks["y"]):
        for k_b in range(blocks["z"]):
            # get index of current block in the limits list
            index_b = get_index(i_b, j_b, k_b, blocks)
            # extract the left and right values of the interval
            # for that block
            # l = limits[index_b][0]
            # r = limits[index_b][1]
            # # if the threshold is not within the limits for this block
            # # continue onto the next block
            if l > threshold or r < threshold:
                continue
            active_ids.append(index_b)
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

for id in active_ids:
    
